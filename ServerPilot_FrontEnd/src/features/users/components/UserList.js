import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Alert,
    Button, IconButton, Modal, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, CircularProgress,
    Grid, TextField, MenuItem, Avatar, Chip, Menu, InputAdornment, Card, CardContent, Tooltip, TablePagination,
    Snackbar
} from '@mui/material';
import { styled } from '@mui/material/styles';
import MuiAlert from '@mui/material/Alert';

import {
    Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, VpnKey as VpnKeyIcon, MoreVert as MoreVertIcon,
    Search as SearchIcon,
    PeopleAltOutlined as PeopleAltOutlinedIcon,
    CheckCircleOutline as CheckCircleOutlineIcon,
    AdminPanelSettings as AdminPanelSettingsIcon,
    HighlightOffOutlined as HighlightOffOutlinedIcon
} from '@mui/icons-material';
import {
    adminListUsers, adminDeleteUser,
    adminSetUserPassword,
    adminUpdateUser, // <-- Add this import
    adminCreateUser  // <-- Add this import if not already
} from '../../../api/userService';
import SetPasswordForm from './SetPasswordForm';
import UserForm from './UserForm'; // Make sure this import exists

// Styled root component for the background
const RootContainer = styled(Box)(({ theme }) => ({
    padding: theme.spacing(3),
}));

// Glassmorphism Card
const GlassCard = styled(Card)(({ theme }) => ({
    background: 'rgba(38, 50, 56, 0.6)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.125)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
}));

const modalStyle = {

    background: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(12px) saturate(180%)',
    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.125)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    color: '#fff',
    minWidth: { md: 900, lg: 900 },
    overflowY: 'hidden',
            '&::-webkit-scrollbar': { display: 'none' },
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '100%',           // Increased width
    maxWidth: 1000,         // Increased maxWidth
    p: 4,
    color: '#fff',
    maxHeight: '90vh',
    overflowY: 'auto',
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
    const [roleFilter] = useState('all');
    const [statusFilter] = useState('all');
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedUserForMenu, setSelectedUserForMenu] = useState(null);
    const [order] = useState('asc');
    const [orderBy] = useState('username');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [addUserModalOpen, setAddUserModalOpen] = useState(false);
    const [editUser, setEditUser] = useState(null); // NEW: Track user being edited
    const [notification, setNotification] = useState({ open: false, severity: 'success', message: '' });
    const [formError, setFormError] = useState({});

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
        // This will trigger when users list changes after a successful operation
        if (!loading && !addUserModalOpen && !error) {
            // Check if we just completed an operation
            const shouldShowNotification = sessionStorage.getItem('userOperationSuccess');
            if (shouldShowNotification) {
                setNotification({ 
                    open: true, 
                    severity: 'success', 
                    message: shouldShowNotification 
                });
                sessionStorage.removeItem('userOperationSuccess');
            }
        }
    }, [users, loading, addUserModalOpen, error]);

    const handleCreateUser = () => {
        setEditUser(null); // Not editing, just adding
        setAddUserModalOpen(true);
    };

    const handleEditUser = (userId) => {
        const user = users.find(u => u.id === userId);
        if (user) {
            setEditUser(user);
            setAddUserModalOpen(true);
        }
    };

    const handleUserFormSubmit = async (formData) => {
        setLoading(true);
        setFormError({});
        try {
            if (editUser) {
                await adminUpdateUser(editUser.id, formData);
                setAddUserModalOpen(false);
                setEditUser(null);
                setTimeout(() => {
                    setNotification({ open: true, severity: 'success', message: 'User updated successfully!' });
                }, 300);
            } else {
                await adminCreateUser(formData);
                setAddUserModalOpen(false);
                setTimeout(() => {
                    setNotification({ open: true, severity: 'success', message: 'User created successfully!' });
                }, 300);
            }
            fetchUsers();
        } catch (err) {
            // If error is validation error from backend
            if (err.response && err.response.data) {
                setFormError(err.response.data);
            } else {
                setNotification({ open: true, severity: 'error', message: 'Failed to save user. ' + (err.message) });
            }
        } finally {
            setLoading(false);
        }
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
            setTimeout(() => {
                setNotification({ open: true, severity: 'success', message: 'User deleted successfully!' });
            }, 300);
        } catch (err) {
            setDeleteConfirmOpen(false);
            setCurrentUser(null);
            setTimeout(() => {
                setNotification({ open: true, severity: 'error', message: 'Failed to delete user. ' + (err.response?.data?.detail || err.message) });
            }, 300);
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

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleCloseNotification = () => {
        setNotification(prev => ({ ...prev, open: false }));
    };

    return (
        <RootContainer>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, position: 'relative', zIndex: 2 }}>
                <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                    User Management
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleCreateUser}
                    sx={{
                        background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                        boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
                        color: 'white',
                        borderRadius: '25px',
                        padding: '10px 25px',
                    }}
                >
                    Add User
                </Button>
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
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                                    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.6)' },
                                    '&.Mui-focused fieldset': { borderColor: '#FE6B8B' },
                                    color: 'white'
                                },
                                '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                                '& .MuiInputLabel-root.Mui-focused': { color: '#FE6B8B' }
                            }}
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
                        <CircularProgress sx={{ color: '#FE6B8B' }} />
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
              sx: {
                background: 'rgba(40, 50, 70, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#fff',
                minWidth: '180px',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                marginTop: '4px',
                '& .MuiMenuItem-root': {
                  padding: '12px 16px',
                  fontSize: '0.875rem',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '4px',
                    margin: '2px 8px',
                    width: 'calc(100% - 16px)',
                  }
                },
                '& .MuiListItemIcon-root': {
                  minWidth: '36px',
                }
              }
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
            <Dialog
                open={deleteConfirmOpen}
                onClose={handleCloseDeleteConfirm}
                PaperProps={{ sx: { background: 'rgba(30, 40, 57, 0.9)', color: '#fff', backdropFilter: 'blur(5px)' } }}
            >
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                        Are you sure you want to delete the user "{currentUser?.username}"? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteConfirm} sx={{ color: '#fff' }}>Cancel</Button>
                    <Button onClick={handleDeleteUser} color="error">Delete</Button>
                </DialogActions>
            </Dialog>
            <Modal
                open={setPasswordModalOpen}
                onClose={handleCloseSetPasswordModal}
            >
                <Box sx={modalStyle}>
                    <Typography variant="h6" component="h2" sx={{ mb: 2 }}>Set Password for {userForPasswordSet?.username}</Typography>
                    <SetPasswordForm
                        onSubmit={handleSetPasswordSubmit}
                        onCancel={handleCloseSetPasswordModal}
                        error={setPasswordError}
                        loading={loading}
                    />
                </Box>
            </Modal>

            {/* Add User Modal */}
            <Modal
                open={addUserModalOpen}
                onClose={handleCloseAddUserModal}
            >
                <Box sx={modalStyle}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        {editUser ? 'Edit User' : 'Add New User'}
                    </Typography>
                    <UserForm
                        onSubmit={handleUserFormSubmit}
                        onCancel={handleCloseAddUserModal}
                        isEditMode={!!editUser}
                        initialUser={editUser}
                        loading={loading}
                        error={formError} // Pass error prop
                    />
                </Box>
            </Modal>
            <Snackbar
                open={notification.open}
                autoHideDuration={6000}
                onClose={handleCloseNotification}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <MuiAlert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: '100%' }}>
                    {notification.message}
                </MuiAlert>
            </Snackbar>
        </RootContainer>
    );
}


