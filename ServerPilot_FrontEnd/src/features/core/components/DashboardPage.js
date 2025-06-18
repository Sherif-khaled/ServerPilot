import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, Typography, Alert, Card, CardContent, LinearProgress, Tooltip, useTheme } from '@mui/material';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { Group as GroupIcon, Person as PersonIcon, Business as BusinessIcon, Dns as DnsIcon } from '@mui/icons-material';
import { useAuth } from '../../../AuthContext';
import { getDashboardStats } from '../../../api/userService';
import { useNavigate } from 'react-router-dom';

const StatCard = ({ title, value, total, unit, uptimeComponents, icon, tooltip, onClick }) => {
  const theme = useTheme();
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

  const usagePercent = total > 0 ? (value / total) * 100 : 0;
  const dynamicColor = total ? getColorForUsage(usagePercent) : null;

  return (
        <Tooltip title={tooltip || ''} arrow>
      <Card
        elevation={3}
        onClick={onClick}
        sx={{
          height: '100%',
          cursor: onClick ? 'pointer' : 'default',
          '&:hover': {
            boxShadow: onClick ? 6 : 3,
          },
        }}
      >
      <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            {icon && <Box sx={{ mr: 1.5, color: 'text.secondary' }}>{icon}</Box>}
            <Typography gutterBottom sx={{ flexGrow: 1, color: theme.palette.mode === 'dark' ? 'grey.400' : 'text.secondary' }}>{title}</Typography>
          </Box>
        <Typography variant="h5" component="div">{displayValue}</Typography> 
        {total && !uptimeComponents && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2">out of {total}{unit}</Typography>
            <LinearProgress
              variant="determinate"
              value={usagePercent}
              sx={{
                mt: 0.5,
                height: 8,
                borderRadius: 5,
                '& .MuiLinearProgress-bar': {
                  backgroundColor: dynamicColor,
                },
                backgroundColor: (theme) =>
                  theme.palette.mode === 'light' ? '#e0e0e0' : 'grey.700',
              }}
            />
          </Box>
        )}
      </CardContent>
      </Card>
    </Tooltip>
  );
};

const StatChartCard = ({ title, children, tooltip, onClick }) => {
  const theme = useTheme();
  return (
    <Tooltip title={tooltip || ''} arrow>
    <Card
      elevation={3}
      onClick={onClick}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': {
          boxShadow: onClick ? 6 : 3,
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography gutterBottom sx={{ color: theme.palette.mode === 'dark' ? 'grey.400' : 'text.secondary' }}>{title}</Typography>
        {children}
      </CardContent>
    </Card>
  </Tooltip>
  );
};

const getColorForUsage = (percentage) => {
  if (percentage > 90) return '#f44336'; // red for critical
  if (percentage > 70) return '#ff9800'; // orange for warning
  return '#4caf50'; // green for ok
};

const RamUsageChart = ({ used, total }) => {
  const free = total > used ? total - used : 0;
  const usagePercent = total > 0 ? (used / total) * 100 : 0;
  const data = [
    { name: 'Used', value: parseFloat(used.toFixed(2)) },
    { name: 'Free', value: parseFloat(free.toFixed(2)) },
  ];
  const COLORS = [getColorForUsage(usagePercent), '#DDDDDD'];

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart role="img" aria-label={`RAM Usage: ${usagePercent.toFixed(0)}% used. ${used.toFixed(1)} of ${total.toFixed(1)} GB used.`}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          fill="#8884d8"
          paddingAngle={5}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <RechartsTooltip formatter={(value, name) => [`${value} GB`, name]} />
        <Legend wrapperStyle={{ paddingTop: '20px' }} />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
          <tspan x="50%" dy="-0.6em" fontSize="24" fontWeight="bold">
            {total > 0 ? `${((used / total) * 100).toFixed(0)}%` : '0%'}
          </tspan>
          <tspan x="50%" dy="1.2em" fontSize="14" fill="grey">
            {`${used.toFixed(1)} of ${total.toFixed(1)} GB`}
          </tspan>
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
  const COLORS = [getColorForUsage(usage), '#DDDDDD'];

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart role="img" aria-label={`CPU Usage: ${usage.toFixed(0)}% used.`}>
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
        <RechartsTooltip formatter={(value) => [`${value.toFixed(2)}%`, 'Usage']} />
         <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
          <tspan x="50%" dy="-0.6em" fontSize="28" fontWeight="bold">
            {`${usage.toFixed(0)}%`}
          </tspan>
          <tspan x="50%" dy="1.2em" fontSize="14" fill="grey">
            Usage
          </tspan>
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
  const navigate = useNavigate();
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
            { id: 'totalUsers', title: 'Total Users', value: statsData.users.total, unit: '', icon: <GroupIcon fontSize="large" />, tooltip: 'Total number of registered users in the system.', path: '/users' },
            { id: 'activeUsers', title: 'Active Users', value: statsData.users.active, unit: '', icon: <PersonIcon fontSize="large" />, tooltip: 'Number of users who have been active recently.', path: '/users' },
            { id: 'totalCustomers', title: 'Total Customers', value: statsData.customers.total, unit: '', icon: <BusinessIcon fontSize="large" />, tooltip: 'Total number of customers managed.', path: '/customers' },
            { id: 'averageUptime', title: 'Average Server Uptime', uptimeComponents: statsData.system?.uptime_components, tooltip: 'The average uptime across all monitored servers.', path: '/system-health' },
            { id: 'totalBandwidth', title: 'Total Bandwidth (since boot)', value: statsData.system?.total_bandwidth_gb_since_boot, unit: ' GB', tooltip: 'Total network bandwidth consumed since the last server reboot.', path: '/system-health' },
            { id: 'cpuUsage', title: 'CPU Usage', value: statsData.system.cpu_usage_percent, tooltip: 'Current CPU utilization across all cores.', path: '/system-health' },
            { id: 'ramUsage', title: 'RAM Usage', value: statsData.system.ram.used_gb, total: statsData.system.ram.total_gb, tooltip: 'Current RAM consumption.', path: '/system-health' },
            { id: 'storageUsage', title: 'Storage Usage', value: statsData.system.storage.used_gb, total: statsData.system.storage.total_gb, unit: ' GB', tooltip: 'Total used disk space.', path: '/system-health' },
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

  const userMetricCards = cardOrder.filter(c => ['totalUsers', 'activeUsers', 'totalCustomers'].includes(c.id));
  const systemHealthCards = cardOrder.filter(c => ['averageUptime', 'totalBandwidth', 'storageUsage', 'cpuUsage', 'ramUsage'].includes(c.id));

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom>Admin Dashboard</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {stats && (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={cardOrder.map(c => c.id)} strategy={rectSortingStrategy}>
            {/* User Metrics Section */}
            <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 2, mb: 2, display: 'flex', alignItems: 'center' }}>
              <PersonIcon sx={{ mr: 1 }} /> User Metrics
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1.5, mb: 4 }}>
              {userMetricCards.map(card => (
                <Box sx={{ width: { xs: '100%', sm: '50%', md: '33.333%' }, p: 1.5 }} key={card.id}>
                  <SortableCard id={card.id}>
                     <StatCard {...card} onClick={() => card.path && navigate(card.path)} />
                  </SortableCard>
                </Box>
              ))}
            </Box>

            {/* System Health Section */}
            <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4, mb: 2, display: 'flex', alignItems: 'center' }}>
              <DnsIcon sx={{ mr: 1 }} /> System Health
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1.5 }}>
              {systemHealthCards.map(card => {
                const isChart = card.id === 'cpuUsage' || card.id === 'ramUsage';
                const width = isChart ? { xs: '100%', md: '50%' } : { xs: '100%', sm: '50%', md: '33.333%' };
                
                return (
                  <Box sx={{ width, p: 1.5 }} key={card.id}>
                    <SortableCard id={card.id}>
                      {isChart ? (
                        <StatChartCard title={card.title} tooltip={card.tooltip} onClick={() => card.path && navigate(card.path)} >
                          {card.id === 'cpuUsage' ? (
                            <CpuUsageChart usage={card.value} />
                          ) : (
                            <RamUsageChart used={card.value} total={card.total} />
                          )}
                        </StatChartCard>
                      ) : (
                         <StatCard {...card} onClick={() => card.path && navigate(card.path)} />
                      )}
                    </SortableCard>
                  </Box>
                );
              })}
            </Box>
          </SortableContext>
        </DndContext>
      )}
    </Box>
  );
};

export default DashboardPage;
