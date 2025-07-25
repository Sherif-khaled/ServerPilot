import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Button, Grid, Paper, CircularProgress, Alert, Snackbar, Tooltip, IconButton, Tabs, Tab, Collapse, Link, Dialog, DialogTitle, DialogContent, DialogActions, useTheme, Card, CardContent } from '@mui/material';
import { styled } from '@mui/material/styles';
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

//Enable / Disable Animation
const dashboardAnimations = JSON.parse(localStorage.getItem('dashboardAnimations')) ?? false;

const GlassPaper = styled(Paper)(({ theme }) => ({
  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  '&:hover': dashboardAnimations
      ? {
          transform: 'translateY(-10px) scale(1.03)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
      }
      : {
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
      },
  background: 'rgba(38, 50, 56, 0.6)',
  backdropFilter: 'blur(10px) saturate(180%)',
  WebkitBackdropFilter: 'blur(10px) saturate(180%)',
  borderRadius: '12px',
  border: '1px solid rgba(255, 255, 255, 0.125)',
  color: '#fff',
}));

const GlassCard = styled(Card)(({ theme }) => ({
  background: 'rgba(38, 50, 56, 0.6)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  borderRadius: '12px',
  border: '1px solid rgba(255, 255, 255, 0.125)',
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  color: '#fff',
  textAlign: 'center',
}));

const RISK_LEVELS = [
  { key: 'critical', label: 'Critical Risks', color: 'error' },
  { key: 'medium', label: 'Medium Risks', color: 'warning' },
  { key: 'low', label: 'PASSED', color: 'success' },
];

const SecurityAdvisorTab = ({ customerId, serverId }) => {
  const theme = useTheme();
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [isAIConfigured, setIsAIConfigured] = useState(false);
  const [tab, setTab] = useState(0);
  const [collapse, setCollapse] = useState([true, false, false]); // For collapsible sections
  const [confirmBatch, setConfirmBatch] = useState(false);
  const [copiedCommandId, setCopiedCommandId] = useState(null);
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [riskCards, setRiskCards] = useState([]);
  const [selectedRec, setSelectedRec] = useState(null);

  const fetchScanData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getLatestSecurityScan(customerId, serverId);
      setScan(response.data);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setError('No security scan has been run for this server yet.');
      } else {
        setError('Failed to fetch security scan data.');
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
                setLoading(false); // AI not configured, stop loading
            }
        } catch (err) {
            setError('Could not verify AI configuration status.');
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
      setNotification({ open: true, message: 'Scan completed successfully.', severity: 'success' });
    } catch (err) {
      setError('Failed to start or complete the new scan.');
      console.error(err);
    } finally {
      setScanning(false);
    }
  };

    const handleExecuteFix = async (recommendationId) => {
    try {
      await fixRecommendation(customerId, serverId, recommendationId);
      setNotification({ open: true, message: 'Fix has been applied successfully.', severity: 'success' });

      // Optimistically update the UI
      setScan(prevScan => {
        if (!prevScan) return null;
        const updatedRecommendations = prevScan.recommendations.map(rec =>
          rec.id === recommendationId ? { ...rec, status: 'fixed' } : rec
        );
        return { ...prevScan, recommendations: updatedRecommendations };
      });
    } catch (err) {
      const errorMessage = err.response?.data?.details || 'Failed to apply the fix.';
      setNotification({ open: true, message: errorMessage, severity: 'error' });
      console.error(err);
    }
  };

  const handleUpdateStatus = async (recommendationId, status) => {
    try {
      await updateRecommendationStatus(customerId, serverId, recommendationId, status);
      setNotification({ open: true, message: `Recommendation marked as ${status}.`, severity: 'success' });
      fetchScanData(); // Refresh data
    } catch (err) {
      setNotification({ open: true, message: 'Failed to update recommendation.', severity: 'error' });
      console.error(err);
    }
  };

  const handleCloseNotification = (event, reason) => {
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
    // Highlight all code blocks after render
    Prism.highlightAll();
  });

  const handleCopyCommand = (command, recId) => {
    navigator.clipboard.writeText(command);
    setCopiedCommandId(recId);
    setTimeout(() => setCopiedCommandId(null), 1500);
  };

  // Dummy AI explanation fetcher (replace with real API if available)
  const handleOpenExplainDialog = (rec) => {
    setSelectedRec(rec);
    setExplanationOpen(true);
  };

  const handleCloseExplainDialog = () => {
    setExplanationOpen(false);
    setSelectedRec(null);
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress sx={{ color: '#FE6B8B' }}/></Box>;
  }

  if (!isAIConfigured) {
    return (
      <Alert severity="warning" sx={{ m: 3 }}>
        <Typography variant="h6">AI Features Disabled</Typography>
        <Typography sx={{ my: 1 }}>
          To activate intelligent recommendations and scanning, you must first configure your AI API Key and Security Token in the global system settings.
        </Typography>
        <Button
          component={RouterLink}
          to="/settings" state={{ tab: 4 }}
          variant="contained"
          color="primary"
        >
          Go to AI Integration Settings
        </Button>
      </Alert>
    );
  }

  // Helper for tooltips
  const TECH_TERM_TOOLTIPS = {
    'sshd_config': 'The sshd_config file is the main configuration file for the SSH server. It controls how SSH connections are handled.',
    'PermitRootLogin': 'PermitRootLogin is an SSH configuration option that controls whether the root user can log in directly via SSH. Disabling it improves security.',
    // Add more terms as needed
  };

  function renderWithTooltips(text) {
    // Replace technical terms with tooltip-wrapped elements
    return Object.keys(TECH_TERM_TOOLTIPS).reduce((acc, term) => {
      const regex = new RegExp(`\\b(${term})\\b`, 'g');
      return acc.replace(
        regex,
        `<span class="tech-term-tooltip" data-term="${term}">${term}</span>`
      );
    }, text);
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
      setNotification({ open: true, message: 'All critical fixes have been applied.', severity: 'success' });
      await fetchScanData();
    } catch (err) {
      setNotification({ open: true, message: 'Failed to fix all critical issues.', severity: 'error' });
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
        <Typography variant="h5">AI Security Advisor</Typography>
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
            Fix All Critical Issues
          </Button>
          <Button variant="contained" color="primary" onClick={handleRescan} disabled={scanning || loading}>
            {scanning ? <CircularProgress size={24}  sx={{ color: '#FE6B8B' }}/> : 'Re-Scan Server'}
          </Button>
        </Box>
      </Box>

      {/* Confirmation Dialog */}
      {confirmBatch && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            bgcolor: 'rgba(0,0,0,0.3)',
            zIndex: 1300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Paper sx={{ p: 4, minWidth: 320, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Confirm Batch Fix
            </Typography>
            <Typography sx={{ mb: 3 }}>
              Are you sure you want to execute <b>all critical fixes</b>? This action cannot be undone.
            </Typography>
            <Button
              variant="contained"
              color="error"
              sx={{ mr: 2 }}
              onClick={handleBatchFixCritical}
              disabled={scanning}
            >
              Yes, Fix All
            </Button>
            <Button variant="outlined" onClick={() => setConfirmBatch(false)}>
              Cancel
            </Button>
          </Paper>
        </Box>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <GlassCard>
            <CardContent>
              <Typography variant="h4" sx={{ color: '#ff5252', fontWeight: 'bold' }}>{summary.critical}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255, 255, 255, 0.8)' }}>
                <DangerousOutlinedIcon sx={{ mr: 1, color: '#ff5252' }} />
                <Typography>Critical Risks</Typography>
              </Box>
            </CardContent>
          </GlassCard>
        </Grid>
        <Grid item xs={12} sm={4}>
          <GlassCard>
            <CardContent>
              <Typography variant="h4" sx={{ color: '#ffab40', fontWeight: 'bold' }}>{summary.medium}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255, 255, 255, 0.8)' }}>
                <WarningAmberOutlinedIcon sx={{ mr: 1, color: '#ffab40' }} />
                <Typography>Medium Risks</Typography>
              </Box>
            </CardContent>
          </GlassCard>
        </Grid>
        <Grid item xs={12} sm={4}>
          <GlassCard>
            <CardContent>
              <Typography variant="h4" sx={{ color: '#69f0ae', fontWeight: 'bold' }}>{summary.passed}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255, 255, 255, 0.8)' }}>
                <VerifiedUserOutlinedIcon sx={{ mr: 1, color: '#69f0ae' }} />
                <Typography>Checks Passed</Typography>
              </Box>
            </CardContent>
          </GlassCard>
        </Grid>
      </Grid>

      {/* Tabs for risk grouping */}
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
        {RISK_LEVELS.map((level, idx) => (
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
      {RISK_LEVELS.map((level, idx) => (
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
                No {level.label.replace(/^[^ ]+ /, '')} risks found.
              </Alert>
            ) : (
              getRecsByRisk(level.key).map((rec) => (
                <GlassPaper
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
                    // Override background to be transparent to allow glass effect
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
                          Why is this risky?
                        </Link>
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ my: 1 }}
                        component="span"
                      >
                        {/* Render description with tooltips */}
                        {rec.description.split(' ').map((word, idx) => {
                          const cleanWord = word.replace(/[^a-zA-Z0-9_]/g, '');
                          if (TECH_TERM_TOOLTIPS[cleanWord]) {
                            return (
                              <Tooltip key={idx} title={TECH_TERM_TOOLTIPS[cleanWord]} arrow>
                                <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'help' }}>
                                  {word}
                                  <IconButton size="small" sx={{ ml: 0.2, p: 0 }}>
                                    <InfoOutlinedIcon fontSize="inherit" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            );
                          }
                          return word + ' ';
                        })}
                      </Typography>
                      <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                        {/* Same tooltip logic for solution */}
                        {rec.solution.split(' ').map((word, idx) => {
                          const cleanWord = word.replace(/[^a-zA-Z0-9_]/g, '');
                          if (TECH_TERM_TOOLTIPS[cleanWord]) {
                            return (
                              <Tooltip key={idx} title={TECH_TERM_TOOLTIPS[cleanWord]} arrow>
                                <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'help' }}>
                                  {word}
                                  <IconButton size="small" sx={{ ml: 0.2, p: 0 }}>
                                    <InfoOutlinedIcon fontSize="inherit" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            );
                          }
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
                            overflowX: 'auto', // Ensures horizontal scroll on small screens
                            position: 'relative',
                            maxWidth: '100%',
                            whiteSpace: 'pre', // Prevents line wrapping
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
                              Copied!
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
                          Execute
                        </Button>
                        {/* Auto-Fix Indicator */}
                        {rec.risk_level === 'high' ? (
                          <Tooltip title="This fix requires caution. Review before applying.">
                            <Box sx={{ display: 'flex', alignItems: 'center', color: 'error.main', fontWeight: 500, ml: 1 }}>
                              <InfoOutlinedIcon fontSize="small" sx={{ mr: 0.5 }} />
                              <span>Requires Caution</span>
                            </Box>
                          </Tooltip>
                        ) : (
                          <Tooltip title="This fix is considered safe to apply automatically.">
                            <Box sx={{ display: 'flex', alignItems: 'center', color: 'success.main', fontWeight: 500, ml: 1 }}>
                              <span role="img" aria-label="Safe" style={{ fontSize: 18, marginRight: 4 }}>🛡️</span>
                              <span>Safe to Apply</span>
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
                        Ignore
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
                          Revert
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
                        {rec.status === 'acknowledged' ? 'Acknowledged' : "Don't show again"}
                      </Button>
                    </Grid>
                  </Grid>
                </GlassPaper>
              ))
            )}
          </Collapse>
        </Box>
      ))}



      <Snackbar open={notification.open} autoHideDuration={6000} onClose={handleCloseNotification}>
        <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: '100%' }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SecurityAdvisorTab;
