import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Box, CircularProgress, Paper, Typography, Grid, Alert, Card, CardContent, Icon } from '@mui/material';
import { PeopleAltOutlined, CheckCircleOutline, HighlightOffOutlined } from '@mui/icons-material';
import { getUserStats } from '../../../api/userService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await getUserStats();
        setStats(response.data);
        setError('');
      } catch (err) {
        console.error('Failed to fetch user stats:', err);
        setError('Failed to load user statistics. You may not have permission to view this data or the server might be down.');
        setStats(null); // Clear any old stats
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const chartData = {
    labels: ['Total Users', 'Active Users', 'Inactive Users'],
    datasets: [
      {
        label: 'User Counts',
        data: stats ? [stats.total_users, stats.active_users, stats.inactive_users] : [0, 0, 0],
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)', // Blue
          'rgba(75, 192, 192, 0.6)', // Green
          'rgba(255, 99, 132, 0.6)',  // Red
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'User Statistics Overview',
        font: {
            size: 18
        }
      },
    },
    scales: {
        y: {
            beginAtZero: true,
            ticks: {
                stepSize: 1 // Ensure y-axis shows whole numbers for user counts
            }
        }
    }
  };

  const statItems = stats ? [
    {
      title: 'Total Users',
      value: stats.total_users,
      icon: <PeopleAltOutlined sx={{ fontSize: 40 }} />,
      color: 'primary.main',
    },
    {
      title: 'Active Users',
      value: stats.active_users,
      icon: <CheckCircleOutline sx={{ fontSize: 40 }} />,
      color: 'success.main',
    },
    {
      title: 'Inactive Users',
      value: stats.inactive_users,
      icon: <HighlightOffOutlined sx={{ fontSize: 40 }} />,
      color: 'error.main',
    },
  ] : [];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom component="div" sx={{ mb: 4, textAlign: 'center' }}>
        Admin Dashboard
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {/* Statistics Cards */}
      {stats && !error && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {statItems.map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item.title}>
              <Card elevation={3}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Icon component="div" sx={{ color: item.color, mr: 2 }}>{item.icon}</Icon>
                    <Box>
                      <Typography variant="h5" component="div">
                        {item.value}
                      </Typography>
                      <Typography sx={{ mb: 0 }} color="text.secondary">
                        {item.title}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Bar Chart */}
      <Grid container spacing={3}>
        <Grid item xs={12} sx={{ margin: 'auto' }}> 
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '400px' }}> 
            {stats && !error ? (
                <Bar options={chartOptions} data={chartData} />
            ) : (
                !error && !loading && <Typography>No statistics data available for chart.</Typography> 
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
