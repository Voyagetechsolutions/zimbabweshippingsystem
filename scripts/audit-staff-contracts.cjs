// Read-only source inventory for comparing the staff UI with its live backend.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../staff-app/node_modules/typescript');
const root = path.resolve(__dirname, '..');
const calls = [], buttons = [], alerts = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    const file=path.join(dir,entry.name);
    if(entry.isDirectory()) walk(file);
    else if(/\.tsx?$/.test(file)) inspect(file);
  }
}
function inspect(file) {
  const code=fs.readFileSync(file,'utf8');
  const tree=ts.createSourceFile(file,code,ts.ScriptTarget.Latest,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  const location=node=>({file:path.relative(root,file).replaceAll('\\','/'),line:tree.getLineAndCharacterOfPosition(node.getStart()).line+1});
  function visit(node) {
    if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)) {
      const method=node.expression.name.text, arg=node.arguments[0];
      if(['rpc','from','invoke'].includes(method)&&arg&&ts.isStringLiteral(arg)) calls.push({...location(node),method,name:arg.text,expression:node.expression.getText(tree)});
      if(node.expression.getText(tree)==='Alert.alert') alerts.push({...location(node),interactive:node.arguments.length>=3,text:node.getText(tree).slice(0,240)});
    }
    if(ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node)) {
      const tag=node.tagName.getText(tree);
      if(['Pressable','TouchableOpacity','Button'].includes(tag)) {
        const names=node.attributes.properties.filter(ts.isJsxAttribute).map(a=>a.name.getText(tree));
        buttons.push({...location(node),tag,handler:names.includes('onPress'),disabled:names.includes('disabled'),spread:node.attributes.properties.some(ts.isJsxSpreadAttribute)});
      }
    }
    ts.forEachChild(node,visit);
  }
  visit(tree);
}
inspect(path.join(root,'staff-app/App.tsx'));
walk(path.join(root,'staff-app/src'));
console.log(JSON.stringify({
  rpcNames:[...new Set(calls.filter(c=>c.method==='rpc').map(c=>c.name))],
  tableNames:[...new Set(calls.filter(c=>c.method==='from'&&!c.expression.includes('storage')).map(c=>c.name))],
  functions:[...new Set(calls.filter(c=>c.method==='invoke').map(c=>c.name))],
  rpcCalls:calls.filter(c=>c.method==='rpc'),
  buttonCount:buttons.length,
  missingHandlers:buttons.filter(b=>!b.handler&&!b.spread),
  interactiveAlerts:alerts.filter(a=>a.interactive).map(({file,line})=>({file,line})),
}));
