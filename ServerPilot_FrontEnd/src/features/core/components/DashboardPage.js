import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, Typography, Alert, Card, CardContent, LinearProgress } from '@mui/material';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useAuth } from '../../../AuthContext';
import { getDashboardStats } from '../../../api/userService';

const StatCard = ({ title, value, total, unit, color, uptimeComponents }) => {
  let displayValue = `${value}${unit || ''}`;
  if (uptimeComponents) {
    const { years, months, days, hours, minutes } = uptimeComponents;
    const parts = [];
    if (years > 0) parts.push(`${years} year${years > 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} month${months > 1 ? 's' : ''}`);
    if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
    displayValue = parts.join(', ');
  }

  return (
    <Card elevation={3} sx={{ height: '100%' }}>
      <CardContent>
        <Typography color="text.secondary" gutterBottom>{title}</Typography>
        <Typography variant="h5" component="div">{displayValue}</Typography> 
        {total && !uptimeComponents && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2">out of {total}{unit}</Typography>
            <LinearProgress variant="determinate" value={(value / total) * 100} color={color || 'primary'} sx={{ mt: 0.5 }} />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

const StatChartCard = ({ title, children }) => (
    <Card elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography color="text.secondary" gutterBottom>{title}</Typography>
        {children}
      </CardContent>
    </Card>
);

const RamUsageChart = ({ used, total }) => {
  const free = total > used ? total - used : 0;
  const data = [
    { name: 'Used', value: parseFloat(used.toFixed(2)) },
    { name: 'Free', value: parseFloat(free.toFixed(2)) },
  ];
  const COLORS = ['#82ca9d', '#DDDDDD'];

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          fill="#8884d8"
          paddingAngle={5}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value, name) => [`${value} GB`, name]} />
        <Legend wrapperStyle={{ paddingTop: '20px' }} />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fontSize="24">
          {total > 0 ? `${((used / total) * 100).toFixed(0)}%` : '0%'}
        </text>
      </PieChart>
    </ResponsiveContainer>
  );
};

const CpuUsageChart = ({ usage }) => {
  const data = [
    { name: 'Used', value: usage },
    { name: 'Idle', value: 100 - usage },
  ];
  const COLORS = ['#FF8042', '#DDDDDD'];

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          fill="#8884d8"
          paddingAngle={5}
          dataKey="value"
          startAngle={180}
          endAngle={-180}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [`${value.toFixed(2)}%`, 'Usage']} />
         <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fontSize="28" fontWeight="bold">
          {`${usage.toFixed(0)}%`}
        </text>
      </PieChart>
    </ResponsiveContainer>
  );
};


const SortableCard = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
};

const DashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cardOrder, setCardOrder] = useState([]);

  useEffect(() => {
    if (user?.is_staff) {
      getDashboardStats()
        .then(response => {
          const statsData = response.data;
          setStats(statsData);
          const initialCards = [
            { id: 'totalUsers', title: 'Total Users', value: statsData.users.total, unit: '' },
            { id: 'activeUsers', title: 'Active Users', value: statsData.users.active, unit: '' },
            { id: 'totalCustomers', title: 'Total Customers', value: statsData.customers.total, unit: '' },
            { id: 'averageUptime', title: 'Average Server Uptime', uptimeComponents: statsData.system?.uptime_components },
            { id: 'totalBandwidth', title: 'Total Bandwidth (since boot)', value: statsData.system?.total_bandwidth_gb_since_boot, unit: ' GB' },
            { id: 'cpuUsage', title: 'CPU Usage', value: statsData.system.cpu_usage_percent },
            { id: 'ramUsage', title: 'RAM Usage', value: statsData.system.ram.used_gb, total: statsData.system.ram.total_gb },
            { id: 'storageUsage', title: 'Storage Usage', value: statsData.system.storage.used_gb, total: statsData.system.storage.total_gb, unit: ' GB', color: 'warning' },
          ];
          setCardOrder(initialCards);
        })
        .catch(err => {
          console.error('Failed to fetch dashboard stats:', err);
          setError('Failed to load dashboard statistics.');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setCardOrder((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  if (!user?.is_staff) {
    return <Typography variant="h5" sx={{ p: 3 }}>Welcome, {user.first_name || user.username}!</Typography>;
  }

  const chartCards = cardOrder.filter(c => c.id === 'cpuUsage' || c.id === 'ramUsage');
  const statCards = cardOrder.filter(c => c.id !== 'cpuUsage' && c.id !== 'ramUsage');

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom>Admin Dashboard</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {stats && (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={cardOrder.map(c => c.id)} strategy={rectSortingStrategy}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1.5, mb: 4 }}>
              {statCards.map(card => (
                <Box sx={{ width: { xs: '100%', sm: '50%', md: '33.333%' }, p: 1.5 }} key={card.id}>
                  <SortableCard id={card.id}>
                     <StatCard {...card} />
                  </SortableCard>
                </Box>
              ))}
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1.5 }}>
              {chartCards.map(card => (
                <Box sx={{ width: { xs: '100%', md: '50%' }, p: 1.5 }} key={card.id}>
                  <SortableCard id={card.id}>
                    {card.id === 'cpuUsage' ? (
                      <StatChartCard title={card.title}>
                        <CpuUsageChart usage={card.value} />
                      </StatChartCard>
                    ) : (
                      <StatChartCard title={card.title}>
                        <RamUsageChart used={card.value} total={card.total} />
                      </StatChartCard>
                    )}
                  </SortableCard>
                </Box>
              ))}
            </Box>
          </SortableContext>
        </DndContext>
      )}
    </Box>
  );
};

export default DashboardPage;
