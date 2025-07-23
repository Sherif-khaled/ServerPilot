import React, { useState, useEffect } from 'react';
import {Box,Button,Typography,List,ListItem,ListItemIcon,ListItemText,CircularProgress,Paper,Alert} from '@mui/material';
import { FileCopy as FileCopyIcon, Download as DownloadIcon, VpnKey as VpnKeyIcon } from '@mui/icons-material';
import { generateRecoveryCodes, confirmRecoveryCodes } from '../../../services/webAuthnService';
import { getProfile } from '../../../api/userService';
import { Checkbox, FormControlLabel } from '@mui/material';
import { styled } from '@mui/material/styles';

const GlassPaper = styled(Paper)(({ theme }) => ({
    background: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(12px) saturate(180%)',
    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.125)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    padding: theme.spacing(3),
    color: '#fff',
}));

const RecoveryCodesSettings = () => {
    const [codes, setCodes] = useState([]);
    const [loading, setLoading] = useState(false);
        const [error, setError] = useState('');
    const [verified, setVerified] = useState(false);
        const [confirmed, setConfirmed] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                                const res = await getProfile();
                const profile = res.data;
                setVerified(profile.recovery_codes_verified);
            } catch (error) {
                setError('Could not load recovery code status.');
            }
        };

        fetchProfile();
    }, []);

    const handleGenerateCodes = async () => {
        setLoading(true);
        setError('');
        setCodes([]);
        setConfirmed(false);
        try {
                        const data = await generateRecoveryCodes();
            setCodes(data.codes);
            setVerified(data.verified);
        } catch (err) {
            setError('Failed to generate recovery codes. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(codes.join('\n'));
    };

        const handleConfirmCodes = async () => {
        setLoading(true);
        setError('');
        try {
                        const data = await confirmRecoveryCodes();
            setVerified(data.verified);
            setCodes([]); // Clear codes after confirmation
            setConfirmed(false); // Reset checkbox
        } catch (err) {
            setError('Failed to confirm recovery codes. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const downloadCodes = () => {
        const blob = new Blob([codes.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'serverpilot-recovery-codes.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <GlassPaper>
            <Typography variant="h6" gutterBottom>
                Recovery Codes
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Recovery codes can be used to access your account in the event you lose access to your device and cannot receive two-factor authentication codes. Store these codes in a safe place.
            </Typography>

            <Button
                variant="contained"
                onClick={handleGenerateCodes}
                disabled={loading}
                sx={{
                    background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                    boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
                    color: 'white',
                    borderRadius: '25px',
                    padding: '10px 25px',
                    '&:disabled': {
                    background: 'rgba(255, 255, 255, 0.3)',
                    },
                    mt: 3,
                }}
                startIcon={loading ? <CircularProgress size={20} /> : null}
            >
                {codes.length > 0 ? 'Regenerate Codes' : 'Generate Codes'}
            </Button>

            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

                        {verified && <Alert severity="success" sx={{ mt: 2 }}>Your recovery codes are verified and ready.</Alert>}

            {codes.length > 0 && !verified && (
                <Box sx={{ mt: 3 }}>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        Save these codes somewhere safe. Each code can only be used once.
                    </Alert>
                    <List sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0 16px' }}>
                        {codes.map((code, index) => (
                            <ListItem key={index} disablePadding>
                                <ListItemIcon sx={{ minWidth: '40px' }}>
                                    <VpnKeyIcon />
                                </ListItemIcon>
                                <ListItemText primary={code} primaryTypographyProps={{ style: { fontFamily: 'monospace' } }} />
                            </ListItem>
                        ))}
                    </List>
                    <Box sx={{ mt: 2 }}>
                        <Button startIcon={<FileCopyIcon />} onClick={copyToClipboard} sx={{ mr: 1 }}>
                            Copy
                        </Button>
                                                <Button startIcon={<DownloadIcon />} onClick={downloadCodes}>
                            Download
                        </Button>
                    </Box>

                    <Box sx={{ mt: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                                                <Typography variant="body2" sx={{ mb: 1 }}>
                            After copying or downloading your codes, check the box below and confirm to finish setup.
                        </Typography>
                        <FormControlLabel
                            control={<Checkbox checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} 
                            sx={{ 
                                color: 'rgba(255, 255, 255, 0.7)',
                                '&.Mui-checked': {
                                color: '#FE6B8B',
                                '& .MuiSvgIcon-root': {
                                    border: '2px solid #FE6B8B',
                                    borderRadius: '3px',
                                }
                                },
                                '&.Mui-checked:hover': {
                                backgroundColor: 'rgba(254, 107, 139, 0.1)',
                                },
                                '& .MuiSvgIcon-root': {
                                border: '2px solid rgba(255, 255, 255, 0.3)',
                                borderRadius: '3px',
                                }
                            }}  />}
                            label="I have saved these codes in a secure place."
                        />
                        <Button 
                            variant="contained" 
                            color="primary" 
                            onClick={handleConfirmCodes} 
                            disabled={!confirmed || loading}
                            sx={{
                                background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                                boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
                                color: 'white',
                                borderRadius: '25px',
                                padding: '10px 25px',
                                '&:disabled': {
                                background: 'rgba(255, 255, 255, 0.3)',
                                },
                                mt: 3,
                            }}
                        >
                            {loading ? <CircularProgress size={24} /> : 'Confirm & Finish'}
                        </Button>
                    </Box>
                </Box>
            )}
        </GlassPaper>
    );
};

export default RecoveryCodesSettings;
