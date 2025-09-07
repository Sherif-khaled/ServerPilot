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
import { CheckCircleOutline as CheckCircleOutlineIcon, HighlightOffOutlined as HighlightOffOutlinedIcon, Business as BusinessIcon, Person as PersonIcon, Email as EmailIcon, Phone as PhoneIcon } from '@mui/icons-material';
import { getCustomerDetails } from '../../../api/customerService';
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
    <Typography variant="body1" component="span" sx={{ fontWeight: 'bold', width: '160px', flexShrink: 0 }}>{label}:</Typography>
    {valueNode ? (
      <Box component="span" sx={{ wordBreak: 'break-all' }}>{valueNode}</Box>
    ) : (
      <Typography variant="body1" component="span" sx={{ wordBreak: 'break-all' }}>{value}</Typography>
    )}
  </Box>
);

export default function CustomerProfilePage() {
  const { customerId } = useParams();
  const { t } = useTranslation();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadCustomer = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await getCustomerDetails(customerId);
        setCustomer(res.data);
      } catch (e) {
        setError(e?.response?.data?.detail || e.message || 'Failed to load customer.');
      } finally {
        setLoading(false);
      }
    };
    loadCustomer();
  }, [customerId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress size={20} sx={CircularProgressSx}/>
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

  if (!customer) return null;

  const displayName = customer.company_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || t('customers.unknownCustomer') || 'Customer';
  const initials = (customer.company_name || customer.first_name || 'C').charAt(0).toUpperCase();
  const isCompany = (customer.customer_type_name || '').toLowerCase() === 'company';

  return (
    <RootContainer>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, position: 'relative', zIndex: 2 }}>
        <Typography component="h1" variant="h3" align="left" gutterBottom sx={{ fontWeight: 'bold', color: '#fff' }}>
          {t('customers.customerProfile')}
        </Typography>
      </Box>

      <GlassCard>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 5, alignItems: 'flex-start' }}>
            <Box sx={{ width: { xs: '100%', md: '30%' }, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Avatar
                sx={{
                  width: 160,
                  height: 160,
                  border: '4px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                }}
              >
                {initials}
              </Avatar>
              <Typography variant="h6" sx={{ color: '#fff' }}>{displayName}</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>

              {customer.company_name && (
                
                <Chip
                  icon={<BusinessIcon />}
                  label={customer.company_name}
                  size="small"
                  sx={{
                    background: 'linear-gradient(45deg, #6a1b9a, #8e24aa)',
                    color: 'white',
                    fontWeight: 'bold',
                  }}
                />
              )}
              <Chip
                icon={customer.is_active ? <CheckCircleOutlineIcon /> : <HighlightOffOutlinedIcon />}
                label={customer.is_active ? t('customers.active') : t('customers.inactive')}
                size="small"
                color={customer.is_active ? 'success' : 'error'}
                variant="outlined"
                sx={{
                  borderColor: customer.is_active ? 'rgba(102, 187, 106, 0.7)' : 'rgba(244, 67, 54, 0.7)',
                  color: customer.is_active ? '#66bb6a' : '#f44336',
                  '.MuiChip-icon': { color: 'inherit' }
                }}
              />
              </Box>
            </Box>

            <Box sx={{ width: { xs: '100%', md: '70%' }, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Paper sx={{ p: 2, background: 'rgba(255,255,255,0.04)' }}>
              <Typography variant="h6" sx={{ mb: 1, color: '#fff', fontWeight: 'bold' }}>
                  {t('customers.customerInfo')}
                </Typography>
                <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.08)' }} />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>


                  {/* Conditional identity fields based on customer type */}
                  {isCompany ? (
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <DetailItem label={t('customerForm.companyName')} value={customer.company_name || t('common.na')} />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <DetailItem label={t('customerForm.delegatedPerson')} value={customer.delegated_person_name || t('common.na')} />
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <DetailItem label={t('customerForm.firstName')} value={customer.first_name || t('common.na')} />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <DetailItem label={t('customerForm.lastName')} value={customer.last_name || t('common.na')} />
                      </Box>
                    </Box>
                  )}

                  <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.08)' }} />

                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                        <DetailItem label={t('customers.headers.phone')} value={customer.phone_number || t('common.na')} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <DetailItem
                        label={t('customers.headers.email')}
                        value={customer.email || t('common.na')}
                        valueNode={
                          customer.email ? (
                            <Link href={`mailto:${customer.email}`} underline="hover" color="primary.light">
                              {customer.email}
                            </Link>
                          ) : (
                            t('common.na')
                          )
                        }
                      />
                    </Box>
                  </Box>

                  <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.08)' }} />

                  {/* Contact info */}


                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <DetailItem label={t('customers.customerType') || 'Type'} value={customer.customer_type_name || t('users.na')} />
                    </Box>

                  </Box>

                  <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.08)' }} />

                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <DetailItem label={t('customers.createdAt')} value={customer.created_at ? new Date(customer.created_at).toLocaleString() : t('common.na')} />
                    </Box>
                  </Box>
                </Box>
              </Paper>

              {/* Address Section */}
              <Paper sx={{ p: 2, background: 'rgba(255,255,255,0.04)' }}>
                <Typography variant="h6" sx={{ mb: 1, color: '#fff', fontWeight: 'bold' }}>
                  {t('customerForm.address')}
                </Typography>
                <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.08)' }} />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box>
                    <DetailItem label={t('customerForm.address')} value={customer.address_line1 || t('common.na')} />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <DetailItem label={t('customerForm.city')} value={customer.city || t('common.na')} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <DetailItem label={t('customerForm.country')} value={customer.country || t('common.na')} />
                    </Box>
                  </Box>
                </Box>
              </Paper>

              {/* Notes Section */}
              <Paper sx={{ p: 2, background: 'rgba(255,255,255,0.04)' }}>
                <Typography variant="h6" sx={{ mb: 1, color: '#fff', fontWeight: 'bold' }}>
                  {t('customerForm.notes')}
                </Typography>
                <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.08)' }} />
                <Box>
                  <DetailItem label={t('customerForm.notes')} value={customer.notes || t('common.na')} />
                </Box>
              </Paper>
            </Box>
          </Box>
        </Box>
      </GlassCard>
    </RootContainer>
  );
}
