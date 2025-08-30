import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, Typography, Alert, Card, CardContent, LinearProgress, Tooltip, useTheme } from '@mui/material';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { Group as GroupIcon, Person as PersonIcon, Business as BusinessIcon, Dns as DnsIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../AuthContext';
import { getDashboardStats } from '../../../api/userService';
import { useNavigate } from 'react-router-dom';
import { CircularProgressSx } from '../../../common';

const GlassmorphicCard = ({ children, onClick, tooltip }) => {
    // Read animation setting from localStorage (or context if you have one)
    const dashboardAnimations = JSON.parse(localStorage.getItem('dashboardAnimations')) ?? false;

    return (
        <Tooltip title={tooltip || ''} arrow>
            <Card
                onClick={onClick}
                sx={{
                    background: 'rgba(38, 50, 56, 0.6);',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    border: '1px solid rgba(255, 255, 255, 0.125)',
                    borderRadius: '12px',
                    color: '#fff',
                    height: '100%',
                    boxShadow: 24,
                    cursor: onClick ? 'pointer' : 'default',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    '&:hover': dashboardAnimations
                        ? {
                            transform: 'translateY(-10px) scale(1.03)',
                            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
                        }
                        : {
                            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
                        },
                }}
            >
                {children}
            </Card>
        </Tooltip>
    );
};

const StatCard = ({ title, value, total, unit, uptimeComponents, icon, tooltip, onClick }) => {
    const { t } = useTranslation();
    let displayValue = `${value}${unit || ''}`;
    if (uptimeComponents) {
        const { years, months, days, hours, minutes } = uptimeComponents;
        const parts = [];
        if (years > 0) parts.push(`${years} ${years > 1 ? t('dashboard.years') : t('dashboard.year')}`);
        if (months > 0) parts.push(`${months} ${months > 1 ? t('dashboard.months') : t('dashboard.month')}`);
        if (days > 0) parts.push(`${days} ${days > 1 ? t('dashboard.days') : t('dashboard.day')}`);
        if (hours > 0) parts.push(`${hours} ${hours > 1 ? t('dashboard.hours') : t('dashboard.hour')}`);
        if (minutes > 0 || parts.length === 0) parts.push(`${minutes} ${minutes > 1 ? t('dashboard.minutes') : t('dashboard.minute')}`);
        displayValue = parts.join(', ');
    }

    const usagePercent = total > 0 ? (value / total) * 100 : 0;
    const dynamicColor = total ? getColorForUsage(usagePercent) : null;

    return (
        <GlassmorphicCard onClick={onClick} tooltip={tooltip}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                    {icon && <Box sx={{ mr: 1.5, color: 'rgba(255, 255, 255, 0.8)' }}>{icon}</Box>}
                    <Typography gutterBottom sx={{ flexGrow: 1, color: 'rgba(255, 255, 255, 0.8)' }}>{title}</Typography>
                </Box>
                <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>{displayValue}</Typography>
                {total && !uptimeComponents && (
                    <Box sx={{ mt: 1.5 }}>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>{t('dashboard.outOf')} {total}{unit}</Typography>
                        <LinearProgress
                            variant="determinate"
                            value={usagePercent}
                            sx={{
                                mt: 1,
                                height: 10,
                                borderRadius: 5,
                                '& .MuiLinearProgress-bar': {
                                    backgroundColor: dynamicColor,
                                },
                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            }}
                        />
                    </Box>
                )}
            </CardContent>
        </GlassmorphicCard>
    );
};

const StatChartCard = ({ title, children, tooltip, onClick }) => {
    return (
        <GlassmorphicCard onClick={onClick} tooltip={tooltip}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography gutterBottom sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>{title}</Typography>
                <Box sx={{ flexGrow: 1, mt: 2 }}>
                    {children}
                </Box>
            </CardContent>
        </GlassmorphicCard>
    );
};

const getColorForUsage = (percentage) => {
  if (percentage > 90) return '#f44336'; // red for critical
  if (percentage > 70) return '#ff9800'; // orange for warning
  return '#4caf50'; // green for ok
};

const RamUsageChart = ({ used, total }) => {
  const { t } = useTranslation();
  const free = total > used ? total - used : 0;
  const usagePercent = total > 0 ? (used / total) * 100 : 0;
  const data = [
    { name: t('dashboard.used'), value: parseFloat(used.toFixed(2)) },
    { name: t('dashboard.free'), value: parseFloat(free.toFixed(2)) },
  ];
  const COLORS = [getColorForUsage(usagePercent), 'rgba(255, 255, 255, 0.2)'];

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart role="img" aria-label={`RAM Usage: ${usagePercent.toFixed(0)}% used. ${used.toFixed(1)} of ${total.toFixed(1)} GB used.`}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={90}
          fill="#8884d8"
          paddingAngle={5}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <RechartsTooltip
          contentStyle={{
            background: 'rgba(30, 30, 30, 0.8)',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            color: '#fff'
          }}
          formatter={(value, name) => [`${value} GB`, name]}
        />
        <Legend wrapperStyle={{ paddingTop: '20px', color: '#fff' }} />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="#fff">
          <tspan x="50%" dy="-0.6em" fontSize="28" fontWeight="bold">
            {total > 0 ? `${((used / total) * 100).toFixed(0)}%` : '0%'}
          </tspan>
          <tspan x="50%" dy="1.2em" fontSize="14" fill="rgba(255, 255, 255, 0.7)">
            {`${used.toFixed(1)} of ${total.toFixed(1)} GB`}
          </tspan>
        </text>
      </PieChart>
    </ResponsiveContainer>
  );
};

const CpuUsageChart = ({ usage }) => {
  const { t } = useTranslation();
  const data = [
    { name: t('dashboard.used'), value: usage },
    { name: t('dashboard.idle'), value: 100 - usage },
  ];
  const COLORS = [getColorForUsage(usage), 'rgba(255, 255, 255, 0.2)'];

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart role="img" aria-label={`CPU Usage: ${usage.toFixed(0)}% used.`}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={70}
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
        <RechartsTooltip
          contentStyle={{
            background: 'rgba(30, 30, 30, 0.8)',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            color: '#fff'
          }}
          formatter={(value) => [`${value.toFixed(2)}%`, t('dashboard.usage')]}
        />
         <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="#fff">
          <tspan x="50%" dy="-0.6em" fontSize="28" fontWeight="bold">
            {`${usage.toFixed(0)}%`}
          </tspan>
          <tspan x="50%" dy="1.2em" fontSize="14" fill="rgba(255, 255, 255, 0.7)">
            {t('dashboard.usage')}
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
  const { t } = useTranslation();
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
            { id: 'totalUsers', title: t('dashboard.totalUsers'), value: statsData.users.total, unit: '', icon: <GroupIcon fontSize="large" />, tooltip: t('dashboard.tooltips.totalUsers'), path: '/users' },
            { id: 'activeUsers', title: t('dashboard.activeUsers'), value: statsData.users.active, unit: '', icon: <PersonIcon fontSize="large" />, tooltip: t('dashboard.tooltips.activeUsers'), path: '/users' },
            { id: 'totalCustomers', title: t('dashboard.totalCustomers'), value: statsData.customers.total, unit: '', icon: <BusinessIcon fontSize="large" />, tooltip: t('dashboard.tooltips.totalCustomers'), path: '/customers' },
            { id: 'averageUptime', title: t('dashboard.averageServerUptime'), uptimeComponents: statsData.system?.uptime_components, tooltip: t('dashboard.tooltips.averageUptime'), path: '/system-health' },
            { id: 'totalBandwidth', title: t('dashboard.totalBandwidth'), value: statsData.system?.total_bandwidth_gb_since_boot, unit: ' GB', tooltip: t('dashboard.tooltips.totalBandwidth'), path: '/system-health' },
            { id: 'cpuUsage', title: t('dashboard.cpuUsage'), value: statsData.system.cpu_usage_percent, tooltip: t('dashboard.tooltips.cpuUsage'), path: '/system-health' },
            { id: 'ramUsage', title: t('dashboard.ramUsage'), value: statsData.system.ram.used_gb, total: statsData.system.ram.total_gb, tooltip: t('dashboard.tooltips.ramUsage'), path: '/system-health' },
            { id: 'storageUsage', title: t('dashboard.storageUsage'), value: statsData.system.storage.used_gb, total: statsData.system.storage.total_gb, unit: ' GB', tooltip: t('dashboard.tooltips.storageUsage'), path: '/system-health' },
          ];
          setCardOrder(initialCards);
        })
        .catch(err => {
          console.error('Failed to fetch dashboard stats:', err);
          setError(t('dashboard.errors.failedToLoad'));
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user, t]);

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
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'linear-gradient(45deg, #0f2027, #203a43, #2c5364)' }}><CircularProgress size={20} sx={CircularProgressSx} /></Box>;
  }

  if (!user?.is_staff) {
    return (
      <Box sx={{ p: 4, background: 'linear-gradient(45deg, #0f2027, #203a43, #2c5364)', minHeight: '100vh', color: '#fff' }}>
        <Typography variant="h5">{t('dashboard.welcome', { name: user.first_name || user.username })}</Typography>
      </Box>
    );
  }

  const userMetricCards = cardOrder.filter(c => ['totalUsers', 'activeUsers', 'totalCustomers'].includes(c.id));
  const systemHealthCards = cardOrder.filter(c => ['averageUptime', 'totalBandwidth', 'storageUsage', 'cpuUsage', 'ramUsage'].includes(c.id));

  return (
    <Box sx={{ flexGrow: 1, p: 4, background: 'linear-gradient(45deg, #0d1117, #203a43, #0d1117)', minHeight: '100vh' }}>
      <Typography variant="h2" gutterBottom sx={{ color: '#fff', textAlign: 'center', mb: 4 }}>{t('dashboard.adminDashboard')}</Typography>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {stats && (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={cardOrder.map(c => c.id)} strategy={rectSortingStrategy}>
            {/* User Metrics Section */}
            <Typography variant="h4" component="h2" gutterBottom sx={{ mt: 2, mb: 3, display: 'flex', alignItems: 'center', color: '#fff' }}>
              <PersonIcon sx={{ mr: 1.5, fontSize: '2rem' }} /> {t('dashboard.userMetrics')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -2, mb: 5 }}>
              {userMetricCards.map(card => (
                <Box sx={{ width: { xs: '100%', sm: '50%', md: '33.333%' }, p: 2 }} key={card.id}>
                  <SortableCard id={card.id}>
                     <StatCard {...card} onClick={() => card.path && navigate(card.path)} />
                  </SortableCard>
                </Box>
              ))}
            </Box>

            {/* System Health Section */}
            <Typography variant="h4" component="h2" gutterBottom sx={{ mt: 4, mb: 3, display: 'flex', alignItems: 'center', color: '#fff' }}>
              <DnsIcon sx={{ mr: 1.5, fontSize: '2rem' }} /> {t('dashboard.systemHealth')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -2 }}>
              {systemHealthCards.map(card => {
                const isChart = card.id === 'cpuUsage' || card.id === 'ramUsage';
                const width = isChart ? { xs: '100%', md: '50%' } : { xs: '100%', sm: '50%', md: '33.333%' };
                
                return (
                  <Box sx={{ width, p: 2 }} key={card.id}>
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
