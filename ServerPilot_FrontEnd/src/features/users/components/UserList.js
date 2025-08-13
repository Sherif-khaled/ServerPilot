import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Alert,
    Button, IconButton, CircularProgress, Grid, TextField, MenuItem, Avatar, Chip, Menu, 
    InputAdornment, CardContent, Tooltip, TablePagination} from '@mui/material';
import { styled } from '@mui/material/styles';
import { textFieldSx, gradientButtonSx, CircularProgressSx, ConfirmDialog, MenuActionsSx, GlassCard } from '../../../common';

import {Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, VpnKey as VpnKeyIcon, MoreVert as MoreVertIcon,
    Search as SearchIcon,PeopleAltOutlined as PeopleAltOutlinedIcon,CheckCircleOutline as CheckCircleOutlineIcon,
    AdminPanelSettings as AdminPanelSettingsIcon,HighlightOffOutlined as HighlightOffOutlinedIcon} from '@mui/icons-material';
import { adminListUsers, adminDeleteUser, adminSetUserPassword,} from '../../../api/userService';
import RefreshIcon from '@mui/icons-material/Refresh';

import SetPasswordForm from './SetPasswordForm';
import UserForm from './UserForm';
import { CustomSnackbar, useSnackbar } from '../../../common';

const RootContainer = styled(Box)(({ theme }) => ({
    padding: theme.spacing(3),
}));


export default function UserList() {
    const [users, setUsers] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [setPasswordModalOpen, setSetPasswordModalOpen] = useState(false);
    const [userForPasswordSet, setUserForPasswordSet] = useState(null);
    const [setPasswordError, setSetPasswordError] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter] = useState('all');
    const [statusFilter] = useState('all');
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedUserForMenu, setSelectedUserForMenu] = useState(null);
    const [order] = useState('asc');
    const [orderBy] = useState('username');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [addUserModalOpen, setAddUserModalOpen] = useState(false);
    const [editUser, setEditUser] = useState(null); 
    
    const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();
    
    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await adminListUsers();
            const fetchedUsers = Array.isArray(res.data.results) ? res.data.results : (Array.isArray(res.data) ? res.data : []);
            
            const uniqueUsersMap = new Map();
            fetchedUsers.forEach(user => {
                if (user && typeof user.id !== 'undefined') {
                    uniqueUsersMap.set(user.id, user);
                }
            });
            const uniqueUserList = Array.from(uniqueUsersMap.values());
            setUsers(uniqueUserList);
        } catch (err) {
            setError('Failed to load users. ' + (err.response?.data?.detail || err.message));
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    useEffect(() => {
        if (!loading && !addUserModalOpen && !error) {
            const shouldShowNotification = sessionStorage.getItem('userOperationSuccess');
            if (shouldShowNotification) {
                showSuccess(shouldShowNotification);
                sessionStorage.removeItem('userOperationSuccess');
            }
        }
    }, [users, loading, addUserModalOpen, error, showSuccess]);

    const handleCreateUser = () => {
        setEditUser(null); 
        setAddUserModalOpen(true);
    };

    const handleEditUser = (userId) => {
        const user = users.find(u => u.id === userId);
        if (user) {
            setEditUser(user);
            setAddUserModalOpen(true);
        }
    };

    const handleUserFormSuccess = (isEdit = false) => {
        fetchUsers();
        setAddUserModalOpen(false);
        setEditUser(null);
        showSuccess(isEdit ? 'User updated successfully!' : 'User created successfully!');
    };

    const handleUserFormError = (error) => {
        showError(error.message || 'An error occurred while processing your request.');
    };

    const handleCloseAddUserModal = () => {
        setAddUserModalOpen(false);
        setEditUser(null);
    };

    const handleOpenDeleteConfirm = (user) => {
        setCurrentUser(user);
        setDeleteConfirmOpen(true);
    };

    const handleCloseDeleteConfirm = () => {
        setDeleteConfirmOpen(false);
        setCurrentUser(null);
    };

    const handleDeleteUser = async () => {
        if (!currentUser) return;
        setLoading(true);
        setError('');
        try {
            await adminDeleteUser(currentUser.id);
            fetchUsers();
            setDeleteConfirmOpen(false);
            setCurrentUser(null);
            showSuccess('User deleted successfully!');
        } catch (err) {
            setDeleteConfirmOpen(false);
            setCurrentUser(null);
            showError('Failed to delete user. ' + (err.response?.data?.detail || err.message));
            setError('Failed to delete user. ' + (err.response?.data?.detail || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleOpenSetPasswordModal = (user) => {
        setUserForPasswordSet(user);
        setSetPasswordError('');
        setSetPasswordModalOpen(true);
    };

    const handleCloseSetPasswordModal = () => {
        setSetPasswordModalOpen(false);
        setUserForPasswordSet(null);
        setSetPasswordError('');
    };

    const handleSetPasswordSubmit = async (newPassword) => {
        if (!userForPasswordSet) return;
        setLoading(true);
        setSetPasswordError('');
        try {
            await adminSetUserPassword(userForPasswordSet.id, newPassword);
            handleCloseSetPasswordModal();
            showSuccess('Password set successfully!');
        } catch (err) {
            const errorMsg = err.response?.data ? 
                (err.response.data.new_password ? err.response.data.new_password.join(' ') : (typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data))) 
                : err.message;
            setSetPasswordError(`Failed to set password: ${errorMsg}`);
            showError(`Failed to set password: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = useMemo(() => {
        let sortableUsers = [...users];
        sortableUsers.sort((a, b) => {
            const isAsc = order === 'asc';
            if (b[orderBy] < a[orderBy]) {
                return isAsc ? 1 : -1;
            }
            if (b[orderBy] > a[orderBy]) {
                return isAsc ? -1 : 1;
            }
            return 0;
        });

        return sortableUsers.filter(user => {
            const searchTermLower = searchTerm.toLowerCase();
            const matchesSearchTerm = searchTerm === '' ||
                user.username.toLowerCase().includes(searchTermLower) ||
                user.email.toLowerCase().includes(searchTermLower) ||
                (user.first_name && user.first_name.toLowerCase().includes(searchTermLower)) ||
                (user.last_name && user.last_name.toLowerCase().includes(searchTermLower));

            const matchesRole = roleFilter === 'all' ||
                (roleFilter === 'admin' && user.is_staff) ||
                (roleFilter === 'user' && !user.is_staff);

            const matchesStatus = statusFilter === 'all' ||
                (statusFilter === 'active' && user.is_active) ||
                (statusFilter === 'inactive' && !user.is_active);
            
            return matchesSearchTerm && matchesRole && matchesStatus;
        });
    }, [users, searchTerm, roleFilter, statusFilter, order, orderBy]);

    const paginatedUsers = useMemo(() => {
        return filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    }, [filteredUsers, page, rowsPerPage]);

    const totalUsers = users.length;
    const activeUsersCount = users.filter(u => u.is_active).length;
    const adminUsersCount = users.filter(u => u.is_staff).length;

    const managerUsersCount = users.filter(u => u.is_manager).length; 

    const statItems = [
        { title: 'Total Users', value: totalUsers, icon: <PeopleAltOutlinedIcon sx={{ fontSize: 30 }} />, color: 'primary.main' },
        { title: 'Active Users', value: activeUsersCount, icon: <CheckCircleOutlineIcon sx={{ fontSize: 30 }} />, color: 'success.main' },
        { title: 'Admins', value: adminUsersCount, icon: <AdminPanelSettingsIcon sx={{ fontSize: 30 }} />, color: 'warning.main' },
        { title: 'Managers', value: managerUsersCount, icon: <PeopleAltOutlinedIcon sx={{ fontSize: 30 }} />, color: 'info.main' }, 
    ];

    const handleMenuOpen = (event, user) => {
        setAnchorEl(event.currentTarget);
        setSelectedUserForMenu(user);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedUserForMenu(null);
    };

    const handleEditFromMenu = () => {
        handleEditUser(selectedUserForMenu.id);
        handleMenuClose();
    };

    const handleDeleteFromMenu = () => {
        if (selectedUserForMenu) handleOpenDeleteConfirm(selectedUserForMenu);
        handleMenuClose();
    };

    const handleSetPasswordFromMenu = () => {
        if (selectedUserForMenu) handleOpenSetPasswordModal(selectedUserForMenu);
        handleMenuClose();
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    return (
        <RootContainer>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, position: 'relative', zIndex: 2 }}>
                <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                    User Management
                </Typography>
               <Box>
                <Tooltip title="Refresh Users">
                        <IconButton onClick={fetchUsers} sx={{ color: 'white', mr: 1 }}>
                        <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleCreateUser}
                        sx={{...gradientButtonSx}}
                    >
                        Add User
                    </Button>
               </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2, background: 'rgba(211, 47, 47, 0.8)', color: '#fff' }}>{error}</Alert>}

            <Grid container spacing={4} sx={{ mb: 4, position: 'relative', zIndex: 2 }}>
                {statItems.map((item, index) => (
                    <Grid item xs={12} sm={6} md={3} key={index}>
                        <GlassCard>
                            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }} variant="subtitle2">{item.title}</Typography>
                                    <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold' }}>{item.value}</Typography>
                                </Box>
                                {React.cloneElement(item.icon, { sx: { fontSize: 48, color: '#fff', opacity: 0.8 } })}
                            </CardContent>
                        </GlassCard>
                    </Grid>
                ))}
            </Grid>

            <GlassCard sx={{ position: 'relative', zIndex: 2 }}>
                <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                        <TextField
                            fullWidth
                            placeholder="Search Users..."
                            variant="outlined"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            sx={{...textFieldSx}}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        {/* Filters with updated styling */}
                    </Box>
                </CardContent>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
                        <CircularProgress sx={CircularProgressSx} />
                    </Box>
                ) : (
                    <TableContainer component={Paper} sx={{ background: 'transparent' }}>
                        <Table aria-label="user list">
                            <TableHead>
                                <TableRow sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid rgba(255, 255, 255, 0.2)' } }}>
                                    {['User', 'Email', 'Role', 'Status', 'Actions'].map((headCell, index) => (
                                        <TableCell key={headCell} align={index === 4 ? 'right' : 'left'} sx={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 'bold' }}>
                                            {headCell}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedUsers.length === 0 ? (
                                    <TableRow >
                                        <TableCell colSpan={5} align="center" sx={{ border: 0 }}>
                                            <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: 'rgba(255, 255, 255, 0.7)' }}>
                                                <SearchIcon sx={{ fontSize: 60 }} />
                                                <Typography variant="h6">No users found</Typography>
                                                <Typography>Try adjusting your search or filter criteria.</Typography>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedUsers.map((user) => (
                                        <TableRow
                                            key={user.id}
                                            sx={{
                                                '& .MuiTableCell-root': {
                                                    color: '#fff',
                                                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                                                },
                                                '&:hover': {
                                                    background: 'rgba(254,107,139,0.08)',
                                                    transition: 'background 0.2s',
                                                }
                                            }}
                                        >
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    <Avatar src={user.profile_photo_url} sx={{ mr: 2, border: '2px solid #fff' }}>
                                                        {user.username.charAt(0).toUpperCase()}
                                                    </Avatar>
                                                    <Box>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username}</Typography>
                                                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>@{user.username}</Typography>
                                                    </Box>
                                                </Box>
                                            </TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    icon={user.is_staff ? <AdminPanelSettingsIcon /> : <PeopleAltOutlinedIcon />}
                                                    label={user.is_staff ? 'Admin' : 'User'}
                                                    size="small"
                                                    sx={{
                                                        background: user.is_staff ? 'linear-gradient(45deg, #c62828, #f44336)' : 'linear-gradient(45deg, #1565c0, #2196f3)',
                                                        color: 'white',
                                                        fontWeight: 'bold'
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    icon={user.is_active ? <CheckCircleOutlineIcon /> : <HighlightOffOutlinedIcon />}
                                                    label={user.is_active ? 'Active' : 'Inactive'}
                                                    size="small"
                                                    color={user.is_active ? 'success' : 'error'}
                                                    variant="outlined"
                                                    sx={{
                                                        borderColor: user.is_active ? 'rgba(102, 187, 106, 0.7)' : 'rgba(244, 67, 54, 0.7)',
                                                        color: user.is_active ? '#66bb6a' : '#f44336',
                                                        '.MuiChip-icon': { color: 'inherit' }
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                <Tooltip title="Actions">
                                                    <IconButton onClick={(e) => handleMenuOpen(e, user)} sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                                        <MoreVertIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
                <TablePagination
                    sx={{ color: 'rgba(255, 255, 255, 0.7)', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    component="div"
                    count={filteredUsers.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </GlassCard>
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                slotProps={{
            paper: {
              sx: {...MenuActionsSx}
            }
          }}
          disableScrollLock={false}
          disablePortal={false}
          keepMounted={false}
            >
                <MenuItem onClick={handleEditFromMenu}><EditIcon sx={{ mr: 1 }} /> Edit</MenuItem>
                <MenuItem onClick={handleSetPasswordFromMenu}><VpnKeyIcon sx={{ mr: 1 }} /> Set Password</MenuItem>
                <MenuItem onClick={handleDeleteFromMenu} sx={{ color: '#f44336' }}><DeleteIcon sx={{ mr: 1 }} /> Delete</MenuItem>
            </Menu>

            <ConfirmDialog
                    open={deleteConfirmOpen}
                    onClose={handleCloseDeleteConfirm}
                    onConfirm={handleDeleteUser}
                    title="Confirm Deletion"
                    message={`Are you sure you want to delete the user ${currentUser?.username} ? This action cannot be undone.`}
                    confirmText="Yes, Delete"
                    cancelText="Cancel"
                    severity="info"
            />

            <SetPasswordForm
                open={setPasswordModalOpen}
                onClose={handleCloseSetPasswordModal}
                onSubmit={handleSetPasswordSubmit}
                username={userForPasswordSet?.username}
                error={setPasswordError}
                loading={loading}
            />

            <UserForm
                open={addUserModalOpen}
                onClose={handleCloseAddUserModal}
                user={editUser}
                onSuccess={handleUserFormSuccess}
                onError={handleUserFormError}
            />
            <CustomSnackbar
                open={snackbar.open}
                onClose={hideSnackbar}
                severity={snackbar.severity}
                message={snackbar.message}
            />
        </RootContainer>
    );
}


