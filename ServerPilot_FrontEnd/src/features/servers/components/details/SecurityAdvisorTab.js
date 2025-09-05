import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Button, Grid, Alert, CircularProgress, Tooltip, IconButton, Tabs, Tab, Collapse, Link, useTheme, CardContent } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import DangerousOutlinedIcon from '@mui/icons-material/DangerousOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Link as RouterLink } from 'react-router-dom';
import { getLatestSecurityScan, runSecurityScan, updateRecommendationStatus, fixRecommendation } from '../../../../api/serverService';
import { getAIConfigStatus } from '../../../../api/aiService';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-bash';
import ExplainRiskDialog from './ExplainRiskDialog';
import { GlassCard, CircularProgressSx, ConfirmDialog, CustomSnackbar } from '../../../../common';


const RISK_LEVELS = [
  { key: 'critical', color: 'error' },
  { key: 'medium', color: 'warning' },
  { key: 'low', color: 'success' },
];

const SecurityAdvisorTab = ({ customerId, serverId }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const riskLevels = useMemo(() => RISK_LEVELS.map(level => ({
    ...level,
    label: level.key === 'low' ? t('securityAdvisor.tabs.low') : (level.key === 'medium' ? t('securityAdvisor.tabs.medium') : t('securityAdvisor.tabs.critical'))
  })), [t]);
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [isAIConfigured, setIsAIConfigured] = useState(false);
  const [tab, setTab] = useState(0);
  const [collapse, setCollapse] = useState([true, false, false]);
  const [confirmBatch, setConfirmBatch] = useState(false);
  const [copiedCommandId, setCopiedCommandId] = useState(null);
  const [explanationOpen, setExplanationOpen] = useState(false);
  // const [explanationLoading, setExplanationLoading] = useState(false);
  // const [riskCards, setRiskCards] = useState([]);
  const [selectedRec, setSelectedRec] = useState(null);

  const fetchScanData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getLatestSecurityScan(customerId, serverId);
      setScan(response.data);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setError('');
      } else {
        setError(t('securityAdvisor.rescanFail'));
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [customerId, serverId]);

  useEffect(() => {
    const checkAIConfig = async () => {
        try {
            const response = await getAIConfigStatus();
            setIsAIConfigured(response.is_configured);
            if (response.is_configured) {
                fetchScanData();
            } else {
                setLoading(false);
            }
        } catch (err) {
            setError(t('securityAdvisor.rescanFail'));
            console.error(err);
            setLoading(false);
        }
    };

    checkAIConfig();
  }, [fetchScanData]);

  const handleRescan = async () => {
    setScanning(true);
    setError('');
    try {
      const response = await runSecurityScan(customerId, serverId);
      setScan(response.data);
      setNotification({ open: true, message: t('securityAdvisor.rescanSuccess'), severity: 'success' });
    } catch (err) {
      setError(t('securityAdvisor.rescanFail'));
      console.error(err);
    } finally {
      setScanning(false);
    }
  };

    const handleExecuteFix = async (recommendationId) => {
    try {
      await fixRecommendation(customerId, serverId, recommendationId);
      setNotification({ open: true, message: t('securityAdvisor.batchSuccess'), severity: 'success' });

      setScan(prevScan => {
        if (!prevScan) return null;
        const updatedRecommendations = prevScan.recommendations.map(rec =>
          rec.id === recommendationId ? { ...rec, status: 'fixed' } : rec
        );
        return { ...prevScan, recommendations: updatedRecommendations };
      });
    } catch (err) {
      const errorMessage = err.response?.data?.details || t('securityAdvisor.batchFail');
      setNotification({ open: true, message: errorMessage, severity: 'error' });
      console.error(err);
    }
  };

  const handleUpdateStatus = async (recommendationId, status) => {
    try {
      await updateRecommendationStatus(customerId, serverId, recommendationId, status);
      setNotification({ open: true, message: `Recommendation marked as ${status}.`, severity: 'success' });
      fetchScanData();
    } catch (err) {
      setNotification({ open: true, message: t('securityAdvisor.batchFail'), severity: 'error' });
      console.error(err);
    }
  };

  const handleCloseNotification = (reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setNotification({ ...notification, open: false });
  };

  const summary = scan ? {
    critical: scan.recommendations.filter(r => r.risk_level === 'critical' && r.status === 'pending').length,
    medium: scan.recommendations.filter(r => r.risk_level === 'medium' && r.status === 'pending').length,
    passed: scan.recommendations.filter(r => r.status === 'passed' || r.status === 'fixed').length,
  } : { critical: 0, medium: 0, passed: 0 };

  useEffect(() => {
    Prism.highlightAll();
  });

  const handleCopyCommand = (command, recId) => {
    navigator.clipboard.writeText(command);
    setCopiedCommandId(recId);
    setTimeout(() => setCopiedCommandId(null), 1500);
  };

  const handleOpenExplainDialog = (rec) => {
    setSelectedRec(rec);
    setExplanationOpen(true);
  };

  const handleCloseExplainDialog = () => {
    setExplanationOpen(false);
    setSelectedRec(null);
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress size={20} sx={{ color: '#FE6B8B' }}/></Box>;
  }

  if (!isAIConfigured) {
    return (
      <Alert severity="warning" sx={{ m: 3 }}>
        <Typography variant="h6">{t('securityAdvisor.notConfiguredTitle')}</Typography>
        <Typography sx={{ my: 1 }}>
          {t('securityAdvisor.notConfiguredDesc')}
        </Typography>
        <Button
          component={RouterLink}
          to="/settings" state={{ tab: 4 }}
          variant="contained"
          color="primary"
        >
          {t('securityAdvisor.goToSettings')}
        </Button>
      </Alert>
    );
  }

  // Helper to filter recommendations by risk
  const getRecsByRisk = (riskLevel) => {
    if (!scan || !scan.recommendations) return [];
    if (riskLevel === 'low') {
      // The 'PASSED' tab shows items that passed the scan or have been fixed.
      return scan.recommendations.filter(rec => rec.status === 'passed' || rec.status === 'fixed');
    }
    // Other tabs only show pending risks for that level.
    return scan.recommendations.filter(rec => rec.risk_level === riskLevel && rec.status === 'pending');
  };

  // Batch fix handler
  const handleBatchFixCritical = async () => {
    setConfirmBatch(false);
    setScanning(true);
    setError('');
    try {
      // Get all pending critical recommendations
      const criticalRecs = scan.recommendations.filter(
        r => r.risk_level === 'critical' && r.status === 'pending'
      );
      // Execute each one sequentially
      for (const rec of criticalRecs) {
        await fixRecommendation(customerId, serverId, rec.id);
      }
      setNotification({ open: true, message: t('securityAdvisor.batchSuccess'), severity: 'success' });
      await fetchScanData();
    } catch (err) {
      setNotification({ open: true, message: t('securityAdvisor.batchFail'), severity: 'error' });
      console.error(err);
    } finally {
      setScanning(false);
    }
  };

    return (
    <Box sx={{ p: 3 }}>
      {selectedRec && (
        <ExplainRiskDialog
          open={explanationOpen}
          onClose={handleCloseExplainDialog}
          recommendation={selectedRec}
        />
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">{t('securityAdvisor.title')}</Typography>
        <Box>
          <Button
            variant="contained"
            color="error"
            sx={{ mr: 2 }}
            disabled={
              scanning ||
              loading ||
              !scan ||
              scan.recommendations.filter(r => r.risk_level === 'critical' && r.status === 'pending').length === 0
            }
            onClick={() => setConfirmBatch(true)}
          >
            {t('securityAdvisor.fixAllCritical')}
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleRescan} 
            disabled={
              scanning || 
              loading} 
            startIcon={scanning ? <CircularProgress size={20} sx={CircularProgressSx}/> : null} 
            sx={{mr:2}}>
            {t('securityAdvisor.rescan')}
          </Button>
        </Box>
      </Box>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmBatch}
        onClose={() => setConfirmBatch(false)}
        onConfirm={handleBatchFixCritical}
        title={t('securityAdvisor.confirmBatchTitle')}
        message={t('securityAdvisor.confirmBatchMessage')}
        confirmText={t('securityAdvisor.confirmBatchYes')}
        cancelText={t('securityAdvisor.confirmBatchCancel')}
        severity="error"
        confirmButtonProps={{
          disabled: scanning
        }}
      />

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <GlassCard sx={{ textAlign: 'center' }}>
            <CardContent>
              <Typography variant="h4" sx={{ color: '#ff5252', fontWeight: 'bold' }}>{summary.critical}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255, 255, 255, 0.8)' }}>
                <DangerousOutlinedIcon sx={{ mr: 1, color: '#ff5252' }} />
                <Typography>{t('securityAdvisor.summary.critical')}</Typography>
              </Box>
            </CardContent>
          </GlassCard>
        </Grid>
        <Grid item xs={12} sm={4}>
          <GlassCard sx={{ textAlign: 'center' }}>
            <CardContent>
              <Typography variant="h4" sx={{ color: '#ffab40', fontWeight: 'bold' }}>{summary.medium}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255, 255, 255, 0.8)' }}>
                <WarningAmberOutlinedIcon sx={{ mr: 1, color: '#ffab40' }} />
                <Typography>{t('securityAdvisor.summary.medium')}</Typography>
              </Box>
            </CardContent>
          </GlassCard>
        </Grid>
        <Grid item xs={12} sm={4}>
          <GlassCard sx={{ textAlign: 'center' }}>
            <CardContent>
              <Typography variant="h4" sx={{ color: '#69f0ae', fontWeight: 'bold' }}>{summary.passed}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255, 255, 255, 0.8)' }}>
                <VerifiedUserOutlinedIcon sx={{ mr: 1, color: '#69f0ae' }} />
                <Typography>{t('securityAdvisor.summary.passed')}</Typography>
              </Box>
            </CardContent>
          </GlassCard>
        </Grid>
      </Grid>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          '& .MuiTab-root': { color: 'text.secondary', fontWeight: 'bold' },
          '& .MuiTabs-indicator': { backgroundColor: '#FE6B8B' },
          mb: 2,
        }}
        variant="fullWidth"
        aria-label="Risk Level Tabs"
      >
        {riskLevels.map((level, idx) => (
          <Tab
            key={level.key}
            label={level.label}
            sx={{
              fontWeight: 'bold',
              color: level.color,
              '& .MuiTabs-indicator': { backgroundColor: '#FE6B8B' },
              '&.Mui-selected': { color: level.color },
            }}
          />
        ))}
      </Tabs>

      {/* Collapsible sections for each risk group */}
      {riskLevels.map((level, idx) => (
        <Box key={level.key} sx={{ mb: 2 }}>
          <Box
            sx={{
              display: { xs: 'flex', md: 'none' },
              alignItems: 'center',
              cursor: 'pointer',
              mb: 1,
              fontWeight: 'bold',
              color: level.color,
            }}
            onClick={() => setCollapse(collapse =>
              collapse.map((c, i) => (i === idx ? !c : c))
            )}
          >
            <span style={{ marginRight: 8 }}>{level.label}</span>
            <span>{collapse[idx] ? '▼' : '▶'}</span>
          </Box>
          <Collapse in={tab === idx || collapse[idx]}>
            {getRecsByRisk(level.key).length === 0 ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                {t('securityAdvisor.noneFound', { label: level.label.replace(/^[^ ]+ /, '') })}
              </Alert>
            ) : (
              getRecsByRisk(level.key).map((rec) => (
                <GlassCard
                  key={rec.id}
                  sx={{
                    p: 2,
                    mb: 2,
                    opacity: rec.status !== 'pending' ? 0.5 : 1,
                    borderLeft: `5px solid ${
                      rec.risk_level === 'critical'
                        ? theme.palette.error.main
                        : rec.risk_level === 'medium'
                        ? theme.palette.warning.main
                        : theme.palette.success.main
                    }`,
                    backgroundColor: 'transparent',
                  }}
                >
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={8}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', color: 'white' }}>
                        {rec.title} ({rec.risk_level})
                        <Link
                          component="button"
                          underline="always"
                          sx={{ ml: 2, fontSize: '0.95rem' }}
                          onClick={() => handleOpenExplainDialog(rec)}
                        >
                          {t('securityAdvisor.whyRisky')}
                        </Link>
                      </Typography>
                      <Typography variant="body2" sx={{ my: 1 }} component="span">
                        {rec.description.split(' ').map((word) => {
                          return word + ' ';
                        })}
                      </Typography>
                      <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                        {/* Same tooltip logic for solution */}
                        {rec.solution.split(' ').map((word) => {
                          return word + ' ';
                        })}
                      </Typography>
                      {rec.command_solution && (
                        <Box
                          sx={{
                            mt: 1,
                            p: 1,
                            backgroundColor: '#23241f',
                            borderRadius: 1,
                            fontFamily: 'monospace',
                            fontSize: '0.95rem',
                            color: '#f8f8f2',
                            overflowX: 'auto',
                            position: 'relative',
                            maxWidth: '100%',
                            whiteSpace: 'pre',
                          }}
                        >
                          <IconButton
                            size="small"
                            sx={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              color: copiedCommandId === rec.id ? 'success.main' : 'grey.400',
                              backgroundColor: 'rgba(255,255,255,0.08)',
                              '&:hover': { backgroundColor: 'rgba(255,255,255,0.18)' },
                              zIndex: 2,
                            }}
                            onClick={() => handleCopyCommand(rec.command_solution, rec.id)}
                            aria-label="Copy command"
                          >
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                          <pre style={{ margin: 0, overflowX: 'auto', whiteSpace: 'pre' }}>
                            <code className="language-bash">{rec.command_solution}</code>
                          </pre>
                          {copiedCommandId === rec.id && (
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 4,
                                right: 40,
                                bgcolor: 'success.main',
                                color: '#fff',
                                px: 1,
                                borderRadius: 1,
                                fontSize: '0.8rem',
                                zIndex: 2,
                              }}
                            >
                              {t('securityAdvisor.copied')}
                            </Box>
                          )}
                        </Box>
                      )}
                    </Grid>
                    <Grid
                      item
                      xs={12}
                      md={4}
                      sx={{
                        textAlign: { xs: 'left', md: 'right' },
                        mt: { xs: 2, md: 0 },
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        alignItems: { xs: 'stretch', md: 'center' },
                        gap: 1,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'flex-start', md: 'flex-end' }, mb: { xs: 1, md: 0 } }}>
                        <Button
                          variant="contained"
                          color={rec.risk_level === 'high' ? 'error' : rec.risk_level === 'medium' ? 'warning' : 'success'}
                          size="small"
                          sx={{
                            mr: 1,
                            transition: 'transform 0.1s, box-shadow 0.1s',
                            boxShadow: 1,
                            '&:hover': {
                              transform: 'scale(1.05)',
                              boxShadow: 4,
                              backgroundColor: rec.risk_level === 'high'
                                ? '#d32f2f'
                                : rec.risk_level === 'medium'
                                ? '#fbc02d'
                                : '#388e3c',
                              color: '#fff',
                            },
                            '&:active': {
                              transform: 'scale(0.97)',
                              boxShadow: 2,
                            },
                          }}
                          onClick={() => handleExecuteFix(rec.id)}
                          disabled={rec.status !== 'pending'}
                        >
                          {t('securityAdvisor.execute')}
                        </Button>
                        {/* Auto-Fix Indicator */}
                        {rec.risk_level === 'high' ? (
                          <Tooltip title={t('securityAdvisor.requiresCautionTooltip')}>
                            <Box sx={{ display: 'flex', alignItems: 'center', color: 'error.main', fontWeight: 500, ml: 1 }}>
                              <InfoOutlinedIcon fontSize="small" sx={{ mr: 0.5 }} />
                              <span>{t('securityAdvisor.requiresCaution')}</span>
                            </Box>
                          </Tooltip>
                        ) : (
                          <Tooltip title={t('securityAdvisor.safeToApplyTooltip')}>
                            <Box sx={{ display: 'flex', alignItems: 'center', color: 'success.main', fontWeight: 500, ml: 1 }}>
                              <span role="img" aria-label="Safe" style={{ fontSize: 18, marginRight: 4 }}>🛡️</span>
                              <span>{t('securityAdvisor.safeToApply')}</span>
                            </Box>
                          </Tooltip>
                        )}
                      </Box>
                      <Button
                        variant="text"
                        color="inherit"
                        size="small"
                        sx={{
                          transition: 'color 0.1s, transform 0.1s',
                          '&:hover': {
                            color: '#757575',
                            transform: 'scale(1.05)',
                            textDecoration: 'underline',
                          },
                          '&:active': {
                            transform: 'scale(0.97)',
                          },
                        }}
                        onClick={() => handleUpdateStatus(rec.id, 'ignored')}
                        disabled={rec.status !== 'pending'}
                      >
                        {t('securityAdvisor.ignore')}
                      </Button>
                      {/* REVERT button if fix was applied */}
                      {rec.status === 'executed' && (
                        <Button
                          variant="outlined"
                          color="secondary"
                          size="small"
                          sx={{
                            ml: 1,
                            transition: 'color 0.1s, transform 0.1s',
                            '&:hover': {
                              color: 'secondary.dark',
                              transform: 'scale(1.05)',
                              textDecoration: 'underline',
                            },
                            '&:active': {
                              transform: 'scale(0.97)',
                            },
                          }}
                          onClick={() => handleUpdateStatus(rec.id, 'pending')}
                        >
                          {t('securityAdvisor.revert')}
                        </Button>
                      )}
                      {/* Personalization: Don't show again / Acknowledge risk */}
                      <Button
                        variant="text"
                        color="secondary"
                        size="small"
                        sx={{
                          ml: 1,
                          transition: 'color 0.1s, transform 0.1s',
                          '&:hover': {
                            color: 'secondary.dark',
                            transform: 'scale(1.05)',
                            textDecoration: 'underline',
                          },
                          '&:active': {
                            transform: 'scale(0.97)',
                          },
                        }}
                        onClick={() => handleUpdateStatus(rec.id, 'acknowledged')}
                        disabled={rec.status === 'acknowledged'}
                      >
                        {rec.status === 'acknowledged' ? t('securityAdvisor.acknowledged') : t('securityAdvisor.dontShowAgain')}
                      </Button>
                    </Grid>
                  </Grid>
                </GlassCard>
              ))
            )}
          </Collapse>
        </Box>
      ))}

      <CustomSnackbar
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={handleCloseNotification}
        autoHideDuration={6000}
      />
    </Box>
  );
};

export default SecurityAdvisorTab;
