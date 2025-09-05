import React, { useState, useEffect } from 'react';
import {Box,Button,Typography,List,ListItem,ListItemIcon,ListItemText,CircularProgress,Alert} from '@mui/material';
import { FileCopy as FileCopyIcon, Download as DownloadIcon, VpnKey as VpnKeyIcon } from '@mui/icons-material';
import { generateRecoveryCodes, confirmRecoveryCodes } from '../../../services/webAuthnService';
import { getProfile } from '../../../api/userService';
import { Checkbox, FormControlLabel } from '@mui/material';
import {  GlassPaper, gradientButtonSx, CircularProgressSx, checkBoxSx } from '../../../common';
import { useTranslation } from 'react-i18next';


const RecoveryCodesSettings = () => {
    const [codes, setCodes] = useState([]);
    const [loading, setLoading] = useState(false);
        const [error, setError] = useState('');
    const [verified, setVerified] = useState(false);
        const [confirmed, setConfirmed] = useState(false);
    const { t } = useTranslation();

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                                const res = await getProfile();
                const profile = res.data;
                setVerified(profile.recovery_codes_verified);
            } catch (error) {
                setError(t('recoveryCodes.loadStatusFail'));
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
            setError(t('recoveryCodes.failGenerate'));
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
            setCodes([]);
            setConfirmed(false);
        } catch (err) {
            setError(t('recoveryCodes.failConfirm'));
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
        a.download = t('recoveryCodes.filename');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <GlassPaper>
            <Typography variant="h6" gutterBottom>
                {t('recoveryCodes.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('recoveryCodes.description')}
            </Typography>

            <Button
                variant="contained"
                onClick={handleGenerateCodes}
                disabled={loading}
                sx={{
                   ...gradientButtonSx}}
                startIcon={loading ? <CircularProgress size={20} /> : null}
            >
                {codes.length > 0 ? t('recoveryCodes.regenerate') : t('recoveryCodes.generate')}
            </Button>

            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

                        {verified && <Alert severity="success" sx={{ mt: 2 }}>{t('recoveryCodes.verifiedSuccess')}</Alert>}

            {codes.length > 0 && !verified && (
                <Box sx={{ mt: 3 }}>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        {t('recoveryCodes.warningSave')}
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
                            {t('recoveryCodes.copy')}
                        </Button>
                                                <Button startIcon={<DownloadIcon />} onClick={downloadCodes}>
                            {t('recoveryCodes.download')}
                        </Button>
                    </Box>

                    <Box sx={{ mt: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                                                <Typography variant="body2" sx={{ mb: 1 }}>
                            {t('recoveryCodes.confirmInstruction')}
                        </Typography>
                        <FormControlLabel
                            control={<Checkbox checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} 
                            sx={{ 
                                ...checkBoxSx}}  />}
                            label={t('recoveryCodes.confirmCheckbox')}
                        />
                        <Button 
                            variant="contained" 
                            color="primary" 
                            onClick={handleConfirmCodes} 
                            disabled={!confirmed || loading}
                            sx={{
                                ...gradientButtonSx}}
                        >
                            {loading ? <CircularProgress size={20} sx={CircularProgressSx} /> : t('recoveryCodes.confirmFinish')}
                        </Button>
                    </Box>
                </Box>
            )}
        </GlassPaper>
    );
};

export default RecoveryCodesSettings;
