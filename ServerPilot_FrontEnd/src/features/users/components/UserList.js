import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Alert,
    Button, IconButton, Modal, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, CircularProgress,
    Grid, TextField, Select, MenuItem, Avatar, Chip, Menu, InputAdornment, Card, CardContent
} from '@mui/material';
import {
    Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, VpnKey as VpnKeyIcon, MoreVert as MoreVertIcon,
    Search as SearchIcon, CloudUpload as CloudUploadIcon,
    PeopleAltOutlined as PeopleAltOutlinedIcon, 
    CheckCircleOutline as CheckCircleOutlineIcon, 
    AdminPanelSettings as AdminPanelSettingsIcon,
    HighlightOffOutlined as HighlightOffOutlinedIcon // For Inactive Status
} from '@mui/icons-material';
import {
    adminListUsers, adminDeleteUser,
    adminSetUserPassword
} from '../../../api/userService';
import SetPasswordForm from './SetPasswordForm';

const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    maxWidth: 600,
    bgcolor: 'background.paper',
    border: '1px solid #ccc',
    borderRadius: '8px',
    boxShadow: 24,
    p: 4,
    maxHeight: '90vh',
    overflowY: 'auto'
};

export default function UserList() {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null); // Kept for delete and set password actions
    const [setPasswordModalOpen, setSetPasswordModalOpen] = useState(false);
    const [userForPasswordSet, setUserForPasswordSet] = useState(null);
    const [setPasswordError, setSetPasswordError] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedUserForMenu, setSelectedUserForMenu] = useState(null);

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

    const handleCreateUser = () => {
        navigate('/users/new');
    };

    const handleEditUser = (userId) => {
        navigate(`/users/edit/${userId}`);
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
            handleCloseDeleteConfirm();
        } catch (err) {
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
        } catch (err) {
            const errorMsg = err.response?.data ? 
                (err.response.data.new_password ? err.response.data.new_password.join(' ') : (typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data))) 
                : err.message;
            setSetPasswordError(`Failed to set password: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = useMemo(() => {
        return users.filter(user => {
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
    }, [users, searchTerm, roleFilter, statusFilter]);

    const totalUsers = users.length;
    const activeUsersCount = users.filter(u => u.is_active).length;
    const adminUsersCount = users.filter(u => u.is_staff).length;

    const managerUsersCount = users.filter(u => u.is_manager).length; // Placeholder for manager logic

    const statItems = [
        { title: 'Total Users', value: totalUsers, icon: <PeopleAltOutlinedIcon sx={{ fontSize: 30 }} />, color: 'primary.main' },
        { title: 'Active Users', value: activeUsersCount, icon: <CheckCircleOutlineIcon sx={{ fontSize: 30 }} />, color: 'success.main' },
        { title: 'Admins', value: adminUsersCount, icon: <AdminPanelSettingsIcon sx={{ fontSize: 30 }} />, color: 'warning.main' },
        { title: 'Managers', value: managerUsersCount, icon: <PeopleAltOutlinedIcon sx={{ fontSize: 30 }} />, color: 'info.main' }, // Added Managers card
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

    if (loading && users.length === 0) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 200px)' }}><CircularProgress /></Box>;
    }

    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>Users</Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>Manage your team members and their permissions.</Typography>

            {error && !deleteConfirmOpen && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

            <Grid container columnSpacing={2} sx={{ mb: 3 }} alignItems="center" justifyContent="space-between">
                {/* Search Bar - Left side */}
                <Grid columns={12} sx={{ gridColumn: { xs: 'span 12', sm: 'span 5', md: 'span 4' } }}>
                    <TextField
                        fullWidth
                        variant="outlined"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ backgroundColor: 'background.paper'}}
                    />
                </Grid>

                {/* Filters and Buttons - Right side */}
                <Grid columns={12} sx={{ gridColumn: { xs: 'span 12', sm: 'span 7', md: 'auto' } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, flexWrap: 'wrap', justifyContent: { xs: 'flex-start', sm: 'flex-end'} }}>
                        <Select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            displayEmpty
                            variant="outlined"
                            sx={{ minWidth: 130, backgroundColor: 'background.paper' }}
                        >
                            <MenuItem value="all">All Roles</MenuItem>
                            <MenuItem value="admin">Admin</MenuItem>
                            <MenuItem value="user">User</MenuItem>
                            {/* Add Manager filter if needed */}
                        </Select>
                        <Select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            displayEmpty
                            variant="outlined"
                            sx={{ minWidth: 130, backgroundColor: 'background.paper' }}
                        >
                            <MenuItem value="all">All Status</MenuItem>
                            <MenuItem value="active">Active</MenuItem>
                            <MenuItem value="inactive">Inactive</MenuItem>
                        </Select>
                        <Button variant="outlined" startIcon={<CloudUploadIcon />} onClick={() => alert('Export clicked (not implemented)')} sx={{textTransform: 'none'}}>
                            Export
                        </Button>
                        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateUser} sx={{textTransform: 'none'}}>
                            Add User
                        </Button>
                    </Box>
                </Grid>
            </Grid>

            <Grid container columnSpacing={3} sx={{ mb: 3 }}>
                {statItems.map((item) => (
                    <Grid columns={12} key={item.title} sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 3' } }}>
                        <Card elevation={1} sx={{ borderRadius: '8px' }}>
                            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2, '&:last-child': { pb: 2 } }}>
                                <Avatar sx={{ bgcolor: item.color, color: 'common.white', mr: 2, width: 48, height: 48 }}>{item.icon}</Avatar>
                                <Box>
                                    <Typography variant="h6" component="div" fontWeight="bold">
                                        {item.value}
                                    </Typography>
                                    <Typography color="text.secondary">
                                        {item.title}
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
            
            <TableContainer component={Paper} elevation={1} sx={{ borderRadius: '8px' }}>
                <Table sx={{ minWidth: 650 }} aria-label="users table">
                    <TableHead sx={{ backgroundColor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : theme.palette.grey[800] }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: '600', py:1.5 }}>USER</TableCell>
                            <TableCell sx={{ fontWeight: '600', py:1.5 }}>ROLE</TableCell>
                            <TableCell sx={{ fontWeight: '600', py:1.5 }}>STATUS</TableCell>
                            <TableCell sx={{ fontWeight: '600', py:1.5 }}>LAST LOGIN</TableCell>
                            <TableCell sx={{ fontWeight: '600', py:1.5 }}>CREATED</TableCell>
                            <TableCell sx={{ fontWeight: '600', textAlign: 'right', py:1.5 }}>ACTIONS</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading && filteredUsers.length === 0 && users.length > 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 5}}>
                                    <CircularProgress />
                                </TableCell>
                            </TableRow>
                        ) : !loading && filteredUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 5}}>
                                    {users.length === 0 ? 'No users in the system yet.' : 'No users found matching your criteria.'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredUsers.map((user) => (
                                <TableRow key={user.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                    <TableCell sx={{py:1}}>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Avatar src={user.profile_photo} sx={{ mr: 1.5, width: 36, height: 36, fontSize: '0.875rem', bgcolor: user.is_staff ? 'secondary.light' : 'primary.light' }}>
                                                {(!user.profile_photo) && ((user.first_name ? user.first_name.charAt(0) : '') + (user.last_name ? user.last_name.charAt(0) : '') || user.username.charAt(0).toUpperCase())}
                                            </Avatar>
                                            <Box>
                                                <Typography variant="subtitle2" fontWeight="500">{`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username}</Typography>
                                                <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{py:1}}>
                                        <Chip 
                                            label={user.is_staff ? 'Admin' : 'User'} 
                                            color={user.is_staff ? 'info' : 'default'} 
                                            size="small" 
                                            sx={{ borderRadius: '6px', fontWeight: 500, textTransform: 'capitalize' }}
                                        />
                                    </TableCell>
                                    <TableCell sx={{py:1}}>
                                        <Chip 
                                            label={user.is_active ? 'Active' : 'Inactive'} 
                                            color={user.is_active ? 'success' : 'error'} 
                                            size="small" 
                                            variant={user.is_active ? 'filled': 'outlined'}
                                            icon={user.is_active ? <CheckCircleOutlineIcon sx={{fontSize: '1rem', mr: -0.5, ml:0.5}}/> : <HighlightOffOutlinedIcon sx={{fontSize: '1rem', mr: -0.5, ml:0.5}}/>}
                                            sx={{ borderRadius: '6px', fontWeight: 500, textTransform: 'capitalize', pl: user.is_active || user.is_active === false ? 0.5: 0}}
                                        />
                                    </TableCell>
                                    <TableCell sx={{py:1}}>{user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}</TableCell>
                                    <TableCell sx={{py:1}}>{new Date(user.date_joined).toLocaleDateString()}</TableCell>
                                    <TableCell align="right" sx={{py:1}}>
                                        <IconButton size="small" onClick={(event) => handleMenuOpen(event, user)}>
                                            <MoreVertIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{ elevation: 2, sx: { borderRadius: '8px', mt: 0.5 } }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                <MenuItem onClick={handleEditFromMenu} sx={{fontSize: '0.875rem'}}><EditIcon sx={{ mr: 1.5 }} fontSize="small" /> Edit User</MenuItem>
                <MenuItem onClick={handleSetPasswordFromMenu} sx={{fontSize: '0.875rem'}}><VpnKeyIcon sx={{ mr: 1.5 }} fontSize="small" /> Set Password</MenuItem>
                <MenuItem onClick={handleDeleteFromMenu} sx={{fontSize: '0.875rem', color: 'error.main'}}><DeleteIcon sx={{ mr: 1.5 }} fontSize="small" /> Delete User</MenuItem>
            </Menu>

            <Dialog open={deleteConfirmOpen} onClose={handleCloseDeleteConfirm}>
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete user "{currentUser?.username}"? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{pb:2, px:2.5}}>
                    <Button onClick={handleCloseDeleteConfirm} disabled={loading} variant="outlined">Cancel</Button>
                    <Button onClick={handleDeleteUser} color="error" disabled={loading} variant="contained">
                        {loading ? <CircularProgress size={24} color="inherit"/> : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Modal open={setPasswordModalOpen} onClose={handleCloseSetPasswordModal}>
                <Box sx={modalStyle}>
                    <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
                        Set Password for {userForPasswordSet?.username}
                    </Typography>
                    {/* Display set password error directly in this modal */} 
                    {setPasswordError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSetPasswordError('')}>{setPasswordError}</Alert>} 
                    <SetPasswordForm 
                        onSubmit={handleSetPasswordSubmit} 
                        onCancel={handleCloseSetPasswordModal} 
                        loading={loading} 
                        // serverError={setPasswordError} // Pass error to form if it handles it, otherwise display above
                    />
                </Box>
            </Modal>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}


        </Box>
    );
}


