import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, TextField, CardContent, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import Autocomplete from '@mui/material/Autocomplete';
import DnsIcon from '@mui/icons-material/Dns';
import { getCustomers } from '../../../api/customerService';
import ServerList from '../components/ServerList';
import { GlassCard, textFieldSx, CircularProgressSx } from '../../../common';
import { useTranslation } from 'react-i18next';

const RootContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
}));

export default function AllServersPage() {
  const { t } = useTranslation();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    getCustomers()
      .then((res) => {
        if (!mounted) return;
        const data = Array.isArray(res?.data?.results) ? res.data.results : (Array.isArray(res?.data) ? res.data : []);
        setCustomers(data);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.response?.data?.detail || err?.message || 'Failed to load customers');
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const options = useMemo(() => customers.map(c => ({ id: c.id, label: c.first_name + ' ' + c.last_name || c.company_name || c.email || `#${c.id}` })), [customers]);

  // Select first customer by default once loaded
  useEffect(() => {
    if (!loading && !error && !selectedCustomer && options.length > 0) {
      setSelectedCustomer(options[0]);
    }
  }, [loading, error, options, selectedCustomer]);

  return (
    <RootContainer>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress size={20} sx={CircularProgressSx} />
        </Box>
      ) : error ? (
        <GlassCard>
          <CardContent sx={{ p: 3 }}>
            <Typography color="error">{error}</Typography>
          </CardContent>
        </GlassCard>
      ) : (
        <>
          {selectedCustomer ? (
            <ServerList
              customerId={selectedCustomer.id}
              titleLabel={selectedCustomer.label}
              beforeSearch={
                <Box sx={{ mb: 2 }}>
                  <Autocomplete
                    options={options}
                    value={selectedCustomer}
                    onChange={(e, newValue) => setSelectedCustomer(newValue)}
                    isOptionEqualToValue={(option, value) => option?.id === value?.id}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t('servers.common.filterByCustomer', 'Filter by Customer')}
                        placeholder={t('servers.common.typeCustomerName', 'Type customer name...')}
                        variant="outlined"
                        fullWidth
                        sx={{ ...textFieldSx }}
                      />
                    )}
                    sx={{ width: '100%' }}
                    autoHighlight
                    clearOnEscape
                    disableClearable={false}
                  />
                </Box>
              }
            />
          ) : (
            <GlassCard>
              <CardContent sx={{ p: 4, textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>
                <DnsIcon sx={{ fontSize: 60, opacity: 0.3, mb: 2 }} />
                <Typography variant="h6">{t('servers.common.selectCustomerToView', 'Select a customer to view servers')}</Typography>
              </CardContent>
            </GlassCard>
          )}
        </>
      )}
    </RootContainer>
  );
}
