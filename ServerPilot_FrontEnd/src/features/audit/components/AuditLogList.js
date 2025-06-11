import React, { useState, useEffect } from 'react';
import api from '../../../api/apiClient';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    CircularProgress, Typography, Alert, TablePagination
} from '@mui/material';

const AuditLogList = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [count, setCount] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(15);

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            try {
                const response = await api.get(`/audit/logs/?page=${page + 1}&page_size=${rowsPerPage}`);
                setLogs(response.data.results || []);
                setCount(response.data.count || 0);
            } catch (err) {
                console.error("Error fetching audit logs:", err);
                const message = err.response?.data?.detail || 'Failed to fetch audit logs. You may not have permission to view this page.';
                setError(message);
            }
            setLoading(false);
        };

        fetchLogs();
    }, [page, rowsPerPage]);

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}><CircularProgress /></div>;
    }

    if (error) {
        return <Alert severity="error" style={{ margin: '20px' }}>{error}</Alert>;
    }

    return (
        <Paper sx={{ margin: '20px', padding: '20px' }}>
            <Typography variant="h4" gutterBottom>
                Audit Logs
            </Typography>
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
                            <TableRow key={log.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                <TableCell component="th" scope="row">
                                    {log.user ? log.user.username : 'System'}
                                </TableCell>
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
        </Paper>
    );
};

export default AuditLogList;
