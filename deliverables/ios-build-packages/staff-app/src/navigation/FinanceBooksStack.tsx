import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FinanceBooksScreen from '../screens/FinanceBooksScreen';
import { ExpenseDetailsScreen } from '../screens/FinanceExperienceScreens';
import { ZimmyFinanceScreen } from '../screens/FinanceInsightsScreens';
const Stack = createNativeStackNavigator();
export default function FinanceBooksStack(){return <Stack.Navigator><Stack.Screen name="BooksHome" component={FinanceBooksScreen} options={{headerShown:false}}/><Stack.Screen name="ExpenseDetails" component={ExpenseDetailsScreen} options={{headerShown:false}}/><Stack.Screen name="Zimmy" component={ZimmyFinanceScreen} options={{headerShown:false}}/></Stack.Navigator>}
