import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { styled } from '@mui/material/styles';
import {
  Box,
  Avatar,
  Typography,
  Chip,
  CircularProgress,
  Paper,
  Divider,
  Link,
} from '@mui/material';
import { CheckCircleOutline as CheckCircleOutlineIcon, HighlightOffOutlined as HighlightOffOutlinedIcon, AdminPanelSettings as AdminPanelSettingsIcon, PeopleAltOutlined as PeopleAltOutlinedIcon } from '@mui/icons-material';
import { adminGetUser } from '../../../api/userService';
import { GlassCard, CircularProgressSx } from '../../../common';

const RootContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
}));

const SectionHeader = styled(Box)(({ theme }) => ({
    padding: theme.spacing(1, 2),
    color: theme.palette.common.white,
    background: 'rgb(110, 108, 109)',
    backdropFilter: 'blur(10px) saturate(180%)',
    WebkitBackdropFilter: 'blur(10px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.125)',
    borderBottom: 'none',
    borderRadius: '12px 12px 0 0',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  }));

const DetailItem = ({ label, value, valueNode }) => (
  <Box sx={{ width: { xs: '100%', sm: '100%' }, display: 'flex', py: 0.5, px: 1 }}>
    <Typography variant="body1" component="span" sx={{ fontWeight: 'bold', width: '120px', flexShrink: 0 }}>{label}:</Typography>
    {valueNode ? (
      <Box component="span" sx={{ wordBreak: 'break-all' }}>{valueNode}</Box>
    ) : (
      <Typography variant="body1" component="span" sx={{ wordBreak: 'break-all' }}>{value}</Typography>
    )}
  </Box>
);

export default function AdminUserProfilePage() {
  const { userId } = useParams();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [infoLoading, setInfoLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        setInfoLoading(true);

        setError('');
        const res = await adminGetUser(userId);
        setUser(res.data);
      } catch (e) {
        setError(e?.response?.data?.detail || e.message || 'Failed to load user.');
      } finally {
        setLoading(false);
        setInfoLoading(false);

      }
    };
    loadUser();
  }, [userId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!user) return null;

  const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
  const formattedLastLogin = user.last_login ? new Date(user.last_login).toLocaleString() : t('users.na') || 'N/A';

  return (
    <RootContainer>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, position: 'relative', zIndex: 2 }}>
        <Typography component="h1" variant="h3" align="left" gutterBottom sx={{ fontWeight: 'bold', color: '#fff' }}>
          {t('users.viewProfile')}
        </Typography>
      </Box>

      <GlassCard>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 5, alignItems: 'flex-start' }}>
            <Box sx={{ width: { xs: '100%', md: '30%' }, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Avatar
                src={user.profile_photo_url}
                sx={{
                  width: 160,
                  height: 160,
                  border: '4px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                }}
              >
                {user.username?.charAt(0)?.toUpperCase()}
              </Avatar>
              <Typography variant="h6" sx={{ color: '#fff' }}>{name}</Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>@{user.username}</Typography>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                <Chip
                  icon={user.is_staff ? <AdminPanelSettingsIcon /> : <PeopleAltOutlinedIcon />}
                  label={user.is_staff ? t('users.roleAdmin') : t('users.roleUser')}
                  size="small"
                  sx={{
                    background: user.is_staff ? 'linear-gradient(45deg, #c62828, #f44336)' : 'linear-gradient(45deg, #1565c0, #2196f3)',
                    color: 'white',
                    fontWeight: 'bold',
                  }}
                />
                <Chip
                  icon={user.is_active ? <CheckCircleOutlineIcon /> : <HighlightOffOutlinedIcon />}
                  label={user.is_active ? t('users.active') : t('users.inactive')}
                  size="small"
                  color={user.is_active ? 'success' : 'error'}
                  variant="outlined"
                  sx={{
                    borderColor: user.is_active ? 'rgba(102, 187, 106, 0.7)' : 'rgba(244, 67, 54, 0.7)',
                    color: user.is_active ? '#66bb6a' : '#f44336',
                    '.MuiChip-icon': { color: 'inherit' }
                  }}
                />
                <Chip
                  icon={user.is_email_verified ? <CheckCircleOutlineIcon /> : <HighlightOffOutlinedIcon />}
                  label={user.is_email_verified ? t('users.verified') : t('users.notVerified')}
                  size="small"
                  color={user.is_email_verified ? 'success' : 'warning'}
                  variant="outlined"
                  sx={{
                    borderColor: user.is_email_verified ? 'rgba(102, 187, 106, 0.7)' : 'rgba(255, 167, 38, 0.7)',
                    color: user.is_email_verified ? '#66bb6a' : '#ffa726',
                    '.MuiChip-icon': { color: 'inherit' }
                  }}
                />
              </Box>
            </Box>

            <Box sx={{ width: { xs: '100%', md: '70%' }, display: 'flex', flexDirection: 'column', gap: 2 }}>

              <Paper sx={{ p: 2, background: 'rgba(255,255,255,0.04)' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>

                  <Box sx={{ flex: 1 }}>
                    <DetailItem label={t('userProfile.username')} value={user.username} />
                  </Box>
                  <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.08)' }} />
                  <Box sx={{ flex: 1 }}>
                    <DetailItem
                      label={t('userProfile.email')}
                      value={user.email}
                      valueNode={
                        user.email ? (
                          <Link href={`mailto:${user.email}`} underline="hover" color="primary.light">
                            {user.email}
                          </Link>
                        ) : (
                          t('users.na')
                        )
                      }
                    />
                  </Box>
                  </Box>
                  <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.08)' }} />
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <DetailItem label={t('userProfile.firstName')} value={user.first_name || ''} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <DetailItem label={t('userProfile.lastName')} value={user.last_name || ''} />
                    </Box>
                  </Box>
                  <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.08)' }} />
                  <Box>
                    <DetailItem label={t('userProfile.phoneNumber')} value={user.phone_number || t('users.na')} />
                  </Box>
                </Box>
              </Paper>

              <Paper sx={{ p: 2, background: 'rgba(255,255,255,0.04)' }}>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, flexDirection: 'column', gap: 1.5 }}>

                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                    <DetailItem label={t('users.dateJoined')} value={user.date_joined ? new Date(user.date_joined).toLocaleString() : t('users.na')} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                    <DetailItem label={t('users.lastLogin')} value={user.last_login ? new Date(user.last_login).toLocaleString() : t('users.na')} />
                    </Box>
                  </Box>
                  <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.08)' }} />
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                    <DetailItem label={t('users.language')} value={user.language || t('users.na')} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                    <DetailItem label={t('users.dateFormat')} value={user.date_format || t('users.na')} />
                    </Box>
                  </Box>
                  <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.08)' }} />
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                    <DetailItem label={t('users.mfaStatus')} value={user.mfa_enabled ? t('users.enabled') : t('users.disabled')} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                    <DetailItem label={t('users.recoveryCodes')} value={user.recovery_codes_verified ? t('users.verified') : t('users.notVerified')} />
                    </Box>
                  </Box>
                  <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.08)' }} />
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>

                  <Box sx={{ width: { xs: '100%', sm: '50%' } }}>
                    <DetailItem label={t('users.passwordLastChanged')} value={user.password_changed_at ? new Date(user.password_changed_at).toLocaleString() : t('users.na')} />
                  </Box>
                  <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.08)' }} />
                  <Box sx={{ width: { xs: '100%', sm: '50%' } }}>
                  <DetailItem label={t('users.theme')} value={user.theme || t('users.na')} />
                  </Box>
                  </Box>
                </Box>

              </Paper>
            </Box>
          </Box>
        </Box>
      </GlassCard>
    </RootContainer>
  );
}
