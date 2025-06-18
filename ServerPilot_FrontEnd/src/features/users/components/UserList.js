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

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    User Management
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleCreateUser}
                >
                    Add User
                </Button>
            </Box>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {/* Stat Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                {statItems.map((item, index) => (
                    <Grid
                        key={index}
                        size={{
                            xs: 12,
                            sm: 6,
                            md: 3
                        }}>
                        <Card sx={{ display: 'flex', alignItems: 'center', p: 2, boxShadow: 3 }}>
                            <Box sx={{ flexGrow: 1 }}>
                                <Typography color="text.secondary" variant="subtitle2">{item.title}</Typography>
                                <Typography variant="h4" sx={{ color: item.color }}>{item.value}</Typography>
                            </Box>
                            {React.cloneElement(item.icon, { sx: { fontSize: 40, color: item.color } })}
                        </Card>
                    </Grid>
                ))}
            </Grid>
            <Card sx={{ boxShadow: 3 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <TextField
                            fullWidth
                            label="Search Users"
                            variant="outlined"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <Select
                            fullWidth
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            displayEmpty
                        >
                            <MenuItem value="all">All Roles</MenuItem>
                            <MenuItem value="admin">Admin</MenuItem>
                            <MenuItem value="user">User</MenuItem>
                        </Select>
                        <Select
                            fullWidth
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            displayEmpty
                        >
                            <MenuItem value="all">All Statuses</MenuItem>
                            <MenuItem value="active">Active</MenuItem>
                            <MenuItem value="inactive">Inactive</MenuItem>
                        </Select>
                    </Box>
                </CardContent>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <TableContainer>
                        <Table aria-label="user list">
                            <TableHead>
                                <TableRow>
                                    <TableCell>User</TableCell>
                                    <TableCell>Email</TableCell>
                                    <TableCell>Role</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredUsers.map((user) => (
                                    <TableRow key={user.id} hover>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <Avatar src={user.profile_photo_url} sx={{ mr: 2 }}>
                                                    {user.username.charAt(0).toUpperCase()}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="subtitle2">{`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username}</Typography>
                                                    <Typography variant="body2" color="text.secondary">@{user.username}</Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            <Chip 
                                                icon={user.is_staff ? <AdminPanelSettingsIcon /> : <PeopleAltOutlinedIcon />} 
                                                label={user.is_staff ? 'Admin' : 'User'} 
                                                color={user.is_staff ? 'secondary' : 'default'} 
                                                size="small" 
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip 
                                                icon={user.is_active ? <CheckCircleOutlineIcon /> : <HighlightOffOutlinedIcon />} 
                                                label={user.is_active ? 'Active' : 'Inactive'} 
                                                color={user.is_active ? 'success' : 'error'} 
                                                size="small" 
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton onClick={(e) => handleMenuOpen(e, user)}>
                                                <MoreVertIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Card>
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
            >
                <MenuItem onClick={handleEditFromMenu}><EditIcon sx={{ mr: 1 }} /> Edit</MenuItem>
                <MenuItem onClick={handleSetPasswordFromMenu}><VpnKeyIcon sx={{ mr: 1 }} /> Set Password</MenuItem>
                <MenuItem onClick={handleDeleteFromMenu} sx={{ color: 'error.main' }}><DeleteIcon sx={{ mr: 1 }} /> Delete</MenuItem>
            </Menu>
            <Dialog
                open={deleteConfirmOpen}
                onClose={handleCloseDeleteConfirm}
            >
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete the user "{currentUser?.username}"? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteConfirm}>Cancel</Button>
                    <Button onClick={handleDeleteUser} color="error">Delete</Button>
                </DialogActions>
            </Dialog>
            <Modal
                open={setPasswordModalOpen}
                onClose={handleCloseSetPasswordModal}
            >
                <Box sx={modalStyle}>
                    <Typography variant="h6" component="h2">Set Password for {userForPasswordSet?.username}</Typography>
                    <SetPasswordForm 
                        onSubmit={handleSetPasswordSubmit} 
                        onCancel={handleCloseSetPasswordModal} 
                        error={setPasswordError}
                        loading={loading}
                    />
                </Box>
            </Modal>
        </Box>
    );
}


