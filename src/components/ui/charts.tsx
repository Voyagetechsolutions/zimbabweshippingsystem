
import React from 'react';
import {
  ResponsiveContainer,
  AreaChart as RechartsAreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

// Color palette for charts
const COLORS = [
  '#3B82F6', // blue-500
  '#10B981', // green-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#8B5CF6', // purple-500
  '#EC4899', // pink-500
  '#06B6D4', // cyan-500
  '#A855F7', // violet-500
  '#F97316', // orange-500
  '#14B8A6', // teal-500
];

interface ChartProps {
  data: any[];
  index: string;
  categories?: string[];
  category?: string;
  valueFormatter?: (value: number) => string;
  className?: string;
}

export const AreaChart = ({
  data,
  index,
  categories = ['value'],
  valueFormatter = (value) => `${value}`,
  className,
}: ChartProps) => {
  return (
    <ResponsiveContainer width="100%" height="100%" className={className}>
      <RechartsAreaChart
        data={data}
        margin={{
          top: 10,
          right: 30,
          left: 0,
          bottom: 0,
        }}
      >
        <defs>
          {categories.map((category, i) => (
            <linearGradient key={category} id={`color-${category}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.2}/>
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey={index} 
          tick={{ fontSize: 12, fill: '#6b7280' }}
          tickLine={{ stroke: '#d1d5db' }}
          axisLine={{ stroke: '#d1d5db' }}
        />
        <YAxis 
          tick={{ fontSize: 12, fill: '#6b7280' }}
          tickLine={{ stroke: '#d1d5db' }}
          axisLine={{ stroke: '#d1d5db' }}
          tickFormatter={valueFormatter}
        />
        <Tooltip 
          formatter={valueFormatter}
          contentStyle={{ backgroundColor: 'white', borderColor: '#d1d5db', borderRadius: '6px' }}
        />
        <Legend />
        {categories.map((category, i) => (
          <Area
            key={category}
            type="monotone"
            dataKey={category}
            name={category.charAt(0).toUpperCase() + category.slice(1)}
            stroke={COLORS[i % COLORS.length]}
            fillOpacity={1}
            fill={`url(#color-${category})`}
          />
        ))}
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
};

export const BarChart = ({
  data,
  index,
  categories = ['value'],
  valueFormatter = (value) => `${value}`,
  className,
}: ChartProps) => {
  return (
    <ResponsiveContainer width="100%" height="100%" className={className}>
      <RechartsBarChart
        data={data}
        margin={{
          top: 10,
          right: 30,
          left: 0,
          bottom: 0,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis 
          dataKey={index}
          tick={{ fontSize: 12, fill: '#6b7280' }}
          tickLine={{ stroke: '#d1d5db' }}
          axisLine={{ stroke: '#d1d5db' }}
        />
        <YAxis 
          tick={{ fontSize: 12, fill: '#6b7280' }}
          tickLine={{ stroke: '#d1d5db' }}
          axisLine={{ stroke: '#d1d5db' }}
          tickFormatter={valueFormatter}
        />
        <Tooltip 
          formatter={valueFormatter}
          contentStyle={{ backgroundColor: 'white', borderColor: '#d1d5db', borderRadius: '6px' }}
        />
        <Legend />
        {categories.map((category, i) => (
          <Bar
            key={category}
            dataKey={category}
            name={category.charAt(0).toUpperCase() + category.slice(1)}
            fill={COLORS[i % COLORS.length]}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};

export const PieChart = ({
  data,
  index,
  category = 'value',
  valueFormatter = (value) => `${value}`,
  className,
}: ChartProps) => {
  return (
    <ResponsiveContainer width="100%" height="100%" className={className}>
      <RechartsPieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={80}
          fill="#8884d8"
          dataKey={category}
          nameKey={index}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          formatter={valueFormatter}
          contentStyle={{ backgroundColor: 'white', borderColor: '#d1d5db', borderRadius: '6px' }}
        />
        <Legend />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
};

export const DonutChart = ({
  data,
  index,
  category = 'value',
  valueFormatter = (value) => `${value}`,
  className,
}: ChartProps) => {
  return (
    <ResponsiveContainer width="100%" height="100%" className={className}>
      <RechartsPieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          innerRadius={60}
          outerRadius={80}
          fill="#8884d8"
          dataKey={category}
          nameKey={index}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          formatter={valueFormatter}
          contentStyle={{ backgroundColor: 'white', borderColor: '#d1d5db', borderRadius: '6px' }}
        />
        <Legend />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
};
