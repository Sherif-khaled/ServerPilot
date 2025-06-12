import React, { useState, useEffect } from 'react';
import api from '../../../api/apiClient';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    CircularProgress, Typography, Alert, TablePagination, Box, FormControl,
    InputLabel, Select, MenuItem, TextField, Button
} from '@mui/material';

const AuditLogList = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [count, setCount] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(15);
    const [users, setUsers] = useState([]);
    const [filters, setFilters] = useState({ user: '', start_date: '', end_date: '' });
    const [activeFilters, setActiveFilters] = useState({});

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await api.get('/users/?all=true');
                // Handle paginated response for users
                const userList = response.data.results || response.data;
                if (Array.isArray(userList)) {
                    setUsers(userList);
                } else {
                    console.error("Error: Fetched user data is not an array.", userList);
                    setUsers([]); // Default to an empty array on error
                }
            } catch (err) {
                console.error("Failed to fetch users:", err);
            }
        };
        fetchUsers();
    }, []);

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            const params = new URLSearchParams({
                page: page + 1,
                page_size: rowsPerPage,
            });

            if (activeFilters.user) params.append('user', activeFilters.user);
            if (activeFilters.start_date) params.append('start_date', activeFilters.start_date);
            if (activeFilters.end_date) params.append('end_date', activeFilters.end_date);

            try {
                const response = await api.get(`/audit/logs/?${params.toString()}`);
                setLogs(response.data.results || []);
                setCount(response.data.count || 0);
            } catch (err) {
                console.error("Error fetching audit logs:", err);
                const message = err.response?.data?.detail || 'Failed to fetch audit logs.';
                setError(message);
            }
            setLoading(false);
        };

        fetchLogs();
    }, [page, rowsPerPage, activeFilters]);

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const handleApplyFilters = () => {
        setPage(0);
        setActiveFilters(filters);
    };

    const handleClearFilters = () => {
        setFilters({ user: '', start_date: '', end_date: '' });
        setActiveFilters({});
        setPage(0);
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    return (
        <Paper sx={{ margin: '20px', padding: '20px' }}>
            <Typography variant="h4" gutterBottom>Audit Logs</Typography>

            <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel id="user-filter-label">User</InputLabel>
                    <Select
                        labelId="user-filter-label"
                        name="user"
                        value={filters.user}
                        label="User"
                        onChange={handleFilterChange}
                    >
                        <MenuItem value=""><em>All Users</em></MenuItem>
                        {users.map((user) => (
                            <MenuItem key={user.id} value={user.username}>{user.username}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <TextField
                    name="start_date"
                    label="Start Date"
                    type="date"
                    value={filters.start_date}
                    onChange={handleFilterChange}
                    InputLabelProps={{ shrink: true }}
                />
                <TextField
                    name="end_date"
                    label="End Date"
                    type="date"
                    value={filters.end_date}
                    onChange={handleFilterChange}
                    InputLabelProps={{ shrink: true }}
                />
                <Button variant="contained" onClick={handleApplyFilters}>Apply Filters</Button>
                <Button variant="outlined" onClick={handleClearFilters}>Clear</Button>
            </Box>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}><CircularProgress /></div>
            ) : error ? (
                <Alert severity="error" style={{ margin: '20px' }}>{error}</Alert>
            ) : (
                <>
                    <TableContainer component={Paper}>
                        <Table sx={{ minWidth: 650 }} aria-label="audit logs table">
                            <TableHead>
                                <TableRow>
                                    <TableCell>User</TableCell>
                                    <TableCell>Action</TableCell>
                                    <TableCell>Timestamp</TableCell>
                                    <TableCell>IP Address</TableCell>
                                    <TableCell>Details</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {logs.length > 0 ? logs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell>{log.user ? log.user.username : 'System'}</TableCell>
                                        <TableCell>{log.action}</TableCell>
                                        <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                                        <TableCell>{log.ip_address || 'N/A'}</TableCell>
                                        <TableCell>{typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">No logs found.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        rowsPerPageOptions={[15, 25, 50, 100]}
                        component="div"
                        count={count}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                    />
                </>
            )}
        </Paper>
    );
};

export default AuditLogList;
