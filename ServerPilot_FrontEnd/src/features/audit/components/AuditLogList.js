import React, { useState, useEffect, useCallback } from 'react';
import {getAuditSystem, getAuditLogs, getAllUsers} from '../../../api/logsService';

import {Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,CircularProgress, Typography, Alert, TablePagination, Box, FormControl,
    InputLabel, Select, MenuItem, TextField, Button, Tabs, Tab} from '@mui/material';
import { styled } from '@mui/material/styles';
import Chip from '@mui/material/Chip';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import DescriptionIcon from '@mui/icons-material/Description';
import ComputerIcon from '@mui/icons-material/Computer';
import {CircularProgressSx, GlassCard, gradientButtonSx, textFieldSx } from '../../../common';
import { useTranslation } from 'react-i18next';

const StyledTableRow = styled(TableRow)(({ theme }) => ({
    '&:nth-of-type(odd)': {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    '&:last-child td, &:last-child th': {
        border: 0,
    },
    '& .MuiTableCell-root': {
        color: '#fff',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    }
}));

const getLogLevelColor = (level) => {
    switch (level?.toUpperCase()) {
        case 'ERROR':
        case 'CRITICAL':
            return 'error';
        case 'WARNING':
            return 'warning';
        case 'INFO':
            return 'success';
        case 'DEBUG':
            return 'primary';
        default:
            return 'default';
    }
};

const RootContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  maxWidth: '100%',
  background: 'rgba(38, 50, 56, 0.6)',
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
  },
}));

const AuditLogList = () => {
    const { t, i18n } = useTranslation();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [count, setCount] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(15);
    const [users, setUsers] = useState([]);
    const [filters, setFilters] = useState({ user: '', start_date: '', end_date: '' });
    const [activeFilters, setActiveFilters] = useState({});

    const [currentTab, setCurrentTab] = useState(0);
    const [systemLogs, setSystemLogs] = useState([]);
    const [systemLogsLoading, setSystemLogsLoading] = useState(false);
    const [systemLogsError, setSystemLogsError] = useState(null);
    const [systemLogPage, setSystemLogPage] = useState(0);
    const [systemLogCount, setSystemLogCount] = useState(0);
    const [systemLogRowsPerPage, setSystemLogRowsPerPage] = useState(50);
    const [systemLogFilters, setSystemLogFilters] = useState({ level: '', start_date: '', end_date: '' });
    const [activeSystemLogFilters, setActiveSystemLogFilters] = useState({});
    const isRtl = typeof i18n?.dir === 'function' ? i18n.dir() === 'rtl' : (i18n?.language || '').toLowerCase().startsWith('ar');

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await getAllUsers();
                const userList = response.data.results || response.data;
                if (Array.isArray(userList)) {
                    setUsers(userList);
                } else {
                    console.error("Error: Fetched user data is not an array.", userList);
                    setUsers([]);
                }
            } catch (err) {
                console.error("Failed to fetch users:", err);
            }
        };
        fetchUsers();
    }, []);

    const fetchSystemLogs = useCallback(async () => {
        setSystemLogsLoading(true);
        setSystemLogsError(null);

        const params = new URLSearchParams({
            page: systemLogPage + 1,
            page_size: systemLogRowsPerPage,
        });

        if (activeSystemLogFilters.level) params.append('level', activeSystemLogFilters.level);
        if (activeSystemLogFilters.start_date) params.append('start_date', activeSystemLogFilters.start_date);
        if (activeSystemLogFilters.end_date) params.append('end_date', activeSystemLogFilters.end_date);

        try {
            const response = await getAuditSystem(params.toString());
            setSystemLogs(response.data.results || []);
            setSystemLogCount(response.data.count || 0);
        } catch (err) {
            console.error("Error fetching system logs:", err);
            const message = err.response?.data?.detail || 'Failed to fetch system logs.';
            setSystemLogsError(message);
            setSystemLogs([]);
            setSystemLogCount(0);
        }
        setSystemLogsLoading(false);
    }, [systemLogPage, systemLogRowsPerPage, activeSystemLogFilters]);

    useEffect(() => {
        const fetchAuditLogs = async () => {
            setLoading(true);
            setError(null);
            const params = new URLSearchParams({
                page: page + 1,
                page_size: rowsPerPage,
            });

            if (activeFilters.user) params.append('user', activeFilters.user);
            if (activeFilters.start_date) params.append('start_date', activeFilters.start_date);
            if (activeFilters.end_date) params.append('end_date', activeFilters.end_date);

            try {
                const response = await getAuditLogs(params.toString());
                setLogs(response.data.results || []);
                setCount(response.data.count || 0);
            } catch (err) {
                console.error("Error fetching audit logs:", err);
                const message = err.response?.data?.detail || 'Failed to fetch audit logs.';
                setError(message);
            }
            setLoading(false);
        };

        if (currentTab === 0) {
            fetchAuditLogs();
        } else {
            fetchSystemLogs();
        }
    }, [page, rowsPerPage, activeFilters, currentTab, fetchSystemLogs]);

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

    const handleTabChange = (event, newValue) => {
        setCurrentTab(newValue);
    };

    const handleSystemLogFilterChange = (e) => {
        setSystemLogFilters({ ...systemLogFilters, [e.target.name]: e.target.value });
    };

    const handleApplySystemLogFilters = () => {
        setSystemLogPage(0);
        setActiveSystemLogFilters(systemLogFilters);
    };

    const handleClearSystemLogFilters = () => {
        setSystemLogFilters({ level: '', start_date: '', end_date: '' });
        setActiveSystemLogFilters({});
        setSystemLogPage(0);
    };

    const handleSystemLogChangePage = (event, newPage) => {
        setSystemLogPage(newPage);
    };

    const handleSystemLogChangeRowsPerPage = (event) => {
        setSystemLogRowsPerPage(parseInt(event.target.value, 10));
        setSystemLogPage(0);
    };

    return (
        <RootContainer>
            <GlassCard>
                <Paper sx={{ background: 'rgba(38, 50, 56, 0.6)', backdropFilter: 'blur(12px)', borderRadius: '12px', p: 3, color: '#fff', boxShadow: 'none' }}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                        <Tabs 
                            value={currentTab} 
                            onChange={handleTabChange} 
                            aria-label="log tabs" 
                            sx={{
                                '& .MuiTab-root': { color: 'text.secondary', fontWeight: 'bold' },
                                '& .MuiTabs-indicator': { backgroundColor: '#FE6B8B' },
                            }}
                            >
                            <Tab icon={<DescriptionIcon sx={{ml: isRtl ? 1 : 0}}/>} iconPosition="start" label={t('audit.tabs.auditLogs')} />
                            <Tab icon={<ComputerIcon sx={{ml: isRtl ? 1 : 0}}/>} iconPosition="start" label={t('audit.tabs.systemLogs')} />
                        </Tabs>
                    </Box>

                    {currentTab === 0 && (
                        <>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <DescriptionIcon sx={{ mr: 1, fontSize: '2rem', ml: isRtl ? 1 : 0 }}/>
                                <Typography variant="h4" gutterBottom component="div" sx={{ mb: 0 }}>
                                    {t('audit.tabs.auditLogs')}
                                </Typography>
                            </Box>

                            <Paper sx={{ p: 2, mb: 2, background: 'rgba(255, 255, 255, 0.1)', borderRadius: '8px' }}>
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <FormControl sx={{...textFieldSx, minWidth: 200 }}>
                                        <InputLabel id="user-filter-label" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>{t('audit.filters.user')}</InputLabel>
                                        <Select
                                            labelId="user-filter-label"
                                            name="user"
                                            value={filters.user}
                                            label={t('audit.filters.user')}
                                            onChange={handleFilterChange}
                                            sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' }, '& .MuiSvgIcon-root': { color: 'rgba(255, 255, 255, 0.7)' } }}
                                        >
                                            <MenuItem value=""><em>{t('audit.filters.allUsers')}</em></MenuItem>
                                            {users.map((user) => (
                                                <MenuItem key={user.id} value={user.username}>{user.username}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    <TextField
                                        name="start_date"
                                        label={t('audit.filters.startDate')}
                                        type="date"
                                        value={filters.start_date}
                                        onChange={handleFilterChange}
                                        InputLabelProps={{ shrink: true, sx: { color: 'rgba(255, 255, 255, 0.7)' } }}
                                        sx={textFieldSx}
                                    />
                                    <TextField
                                        name="end_date"
                                        label={t('audit.filters.endDate')}
                                        type="date"
                                        value={filters.end_date}
                                        onChange={handleFilterChange}
                                        InputLabelProps={{ shrink: true, sx: { color: 'rgba(255, 255, 255, 0.7)' } }}
                                        sx={textFieldSx}
                                    />
                                    <Button variant="contained" 
                                            onClick={handleApplyFilters} 
                                            startIcon= {<FilterAltOffIcon sx={{ml: isRtl ? 1 : 0}}/>}
                                            sx={{
                                               ...gradientButtonSx
                                                }}
                                            >{t('audit.filters.apply')}</Button>
                                    <Button variant="outlined" onClick={handleClearFilters} sx={{ borderRadius: '25px',color: 'white', borderColor: 'rgba(255, 255, 255, 0.7)' }}>{t('audit.filters.clear')}</Button>
                                </Box>
                            </Paper>

                            {loading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}><CircularProgress sx={CircularProgressSx} /></div>
                            ) : error ? (
                                <Alert severity="error" style={{ margin: '20px', background: 'rgba(211, 47, 47, 0.8)', color: '#fff' }}>{error}</Alert>
                            ) : (
                                <>
                                    <TableContainer component={Paper} sx={{ background: 'transparent' }}>
                                        <Table sx={{ minWidth: 650 }} aria-label="audit logs table">
                                            <TableHead>
                                                <TableRow sx={{ '& .MuiTableCell-root': { color: 'rgba(255, 255, 255, 0.8)', fontWeight: 'bold', borderBottom: '1px solid rgba(255, 255, 255, 0.2)' } }}>
                                                    <TableCell>{t('audit.labels.user')}</TableCell>
                                                    <TableCell>{t('audit.labels.action')}</TableCell>
                                                    <TableCell>{t('audit.labels.timestamp')}</TableCell>
                                                    <TableCell>{t('audit.labels.ip')}</TableCell>
                                                    <TableCell>{t('audit.labels.details')}</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {logs.length > 0 ? logs.map((log) => (
                                                    <StyledTableRow key={log.id}>
                                                        <TableCell>{log.user ? log.user.username : 'System'}</TableCell>
                                                        <TableCell>{log.action}</TableCell>
                                                        <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                                                        <TableCell>{log.ip_address || 'N/A'}</TableCell>
                                                        <TableCell>{typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}</TableCell>
                                                    </StyledTableRow>
                                                )) : (
                                                    <TableRow>
                                                        <TableCell colSpan={5} align="center">{t('audit.labels.noLogs')}</TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                    <TablePagination
                                        sx={{ color: 'rgba(255, 255, 255, 0.7)', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}
                                        rowsPerPageOptions={[15, 25, 50, 100]}
                                        component="div"
                                        count={count}
                                        rowsPerPage={rowsPerPage}
                                        page={page}
                                        onPageChange={handleChangePage}
                                        onRowsPerPageChange={handleChangeRowsPerPage}
                                        labelRowsPerPage={t('common.rowsPerPage')}
                                        labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count}`}
                                    />
                                 </>
                            )}
                        </>
                    )}

                    {currentTab === 1 && (
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <ComputerIcon sx={{ mr: 1, fontSize: '2rem', ml: isRtl ? 1 : 0 }} />
                                <Typography variant="h4" gutterBottom component="div" sx={{ mb: 0 }}>
                                    {t('audit.tabs.systemLogs')}
                                </Typography>
                            </Box>

                            <Paper sx={{ p: 2, mb: 2, background: 'rgba(255, 255, 255, 0.1)', borderRadius: '8px' }}>
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <FormControl sx={{...textFieldSx, minWidth: 120 }}>
                                        <InputLabel id="level-filter-label" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>{t('audit.filters.level')}</InputLabel>
                                        <Select
                                            labelId="level-filter-label"
                                            name="level"
                                            value={systemLogFilters.level}
                                            label={t('audit.filters.level')}
                                            onChange={handleSystemLogFilterChange}
                                            sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' }, '& .MuiSvgIcon-root': { color: 'rgba(255, 255, 255, 0.7)' } }}
                                        >
                                            <MenuItem value=""><em>{t('audit.filters.all')}</em></MenuItem>
                                            <MenuItem value="DEBUG">{t('audit.filters.debug')}</MenuItem>
                                            <MenuItem value="INFO">{t('audit.filters.info')}</MenuItem>
                                            <MenuItem value="WARNING">{t('audit.filters.warning')}</MenuItem>
                                            <MenuItem value="ERROR">{t('audit.filters.error')}</MenuItem>
                                            <MenuItem value="CRITICAL">{t('audit.filters.critical')}</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <TextField
                                        name="start_date"
                                        label={t('audit.filters.startDate')}
                                        type="date"
                                        value={systemLogFilters.start_date}
                                        onChange={handleSystemLogFilterChange}
                                        InputLabelProps={{ shrink: true, sx: { color: 'rgba(255, 255, 255, 0.7)' } }}
                                        sx={textFieldSx}
                                    />
                                    <TextField
                                        name="end_date"
                                        label={t('audit.filters.endDate')}
                                        type="date"
                                        value={systemLogFilters.end_date}
                                        onChange={handleSystemLogFilterChange}
                                        InputLabelProps={{ shrink: true, sx: { color: 'rgba(255, 255, 255, 0.7)' } }}
                                        sx={textFieldSx}
                                    />
                                    <Button variant="contained" 
                                            onClick={handleApplySystemLogFilters}
                                            startIcon= {<FilterAltOffIcon sx={{ml: isRtl ? 1 : 0}}/>} 
                                            sx={{
                                                ...gradientButtonSx
                                                }}
                                            >{t('audit.filters.apply')}</Button>
                                    <Button variant="outlined" onClick={handleClearSystemLogFilters} sx={{ color: 'white',borderRadius: '25px', borderColor: 'rgba(255, 255, 255, 0.7)' }}>{t('audit.filters.clear')}</Button>
                                </Box>
                            </Paper>

                            {systemLogsLoading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}><CircularProgress sx={{ color: '#FE6B8B' }} /></div>
                            ) : systemLogsError ? (
                                <Alert severity="error" style={{ margin: '20px', background: 'rgba(211, 47, 47, 0.8)', color: '#fff' }}>{systemLogsError}</Alert>
                            ) : (
                                <>
                                    <TableContainer component={Paper} sx={{ background: 'transparent' }}>
                                        <Table sx={{ minWidth: 650 }} aria-label="system logs table">
                                            <TableHead>
                                                <TableRow sx={{ '& .MuiTableCell-root': { color: 'rgba(255, 255, 255, 0.8)', fontWeight: 'bold', borderBottom: '1px solid rgba(255, 255, 255, 0.2)' } }}>
                                                    <TableCell sx={{ width: '20%' }}>{t('audit.labels.timestamp')}</TableCell>
                                                    <TableCell sx={{ width: '10%' }}>{t('audit.filters.level')}</TableCell>
                                                    <TableCell>{t('audit.labels.details')}</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {systemLogs.length > 0 ? systemLogs.map((log, index) => (
                                                    <StyledTableRow key={index}>
                                                        <TableCell>{log.timestamp}</TableCell>
                                                        <TableCell>
                                                            <Chip label={log.level} color={getLogLevelColor(log.level)} size="small" />
                                                        </TableCell>
                                                        <TableCell sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{log.message}</TableCell>
                                                    </StyledTableRow>
                                                )) : (
                                                    <TableRow>
                                                        <TableCell colSpan={3} align="center">{t('audit.labels.noSystemLogs')}</TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                    <TablePagination
                                        sx={{ color: 'rgba(255, 255, 255, 0.7)', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}
                                        rowsPerPageOptions={[15, 25, 50, 100]}
                                        component="div"
                                        count={systemLogCount}
                                        rowsPerPage={systemLogRowsPerPage}
                                        page={systemLogPage}
                                        onPageChange={handleSystemLogChangePage}
                                        onRowsPerPageChange={handleSystemLogChangeRowsPerPage}
                                        labelRowsPerPage={t('common.rowsPerPage')}
                                        labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count}`}
                                    />
                                </>
                            )}
                        </Box>
                    )}
                </Paper>
            </GlassCard>
        </RootContainer>
    );
};

export default AuditLogList;
