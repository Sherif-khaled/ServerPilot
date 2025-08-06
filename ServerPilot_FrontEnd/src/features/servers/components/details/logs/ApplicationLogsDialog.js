import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, 
    CircularProgress, Alert, Typography, Box, Divider, Paper,
    IconButton, Snackbar, FormGroup, FormControlLabel, Checkbox, Switch, Collapse
} from '@mui/material';
import {
    ErrorOutline, WarningAmberOutlined, InfoOutlined,
    ContentCopy, Close as CloseIcon, CheckCircleOutline as MuiCheckCircleOutline, Refresh as RefreshIcon,
    ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../../../../../api/apiClient';



const getLogLineInfo = (line) => {
    const lowerLine = line.toLowerCase();
    const iconSx = { fontSize: '1.1rem', verticalAlign: 'middle', marginRight: '8px' };
    const baseStyle = {
        padding: '2px 8px',
        borderLeft: '4px solid',
        marginBottom: '2px',
        display: 'flex',
        alignItems: 'center',
    };

    if (lowerLine.includes('error') || lowerLine.includes('critical')) {
        return { severity: 'error', style: { ...baseStyle, color: '#f44336', borderLeftColor: '#f44336' }, icon: <ErrorOutline sx={iconSx} /> };
    }
    if (lowerLine.includes('warn') || lowerLine.includes('warning')) {
        return { severity: 'warning', style: { ...baseStyle, color: '#ff9800', borderLeftColor: '#ff9800' }, icon: <WarningAmberOutlined sx={iconSx} /> };
    }
    if (lowerLine.includes('success') || lowerLine.includes('safe') || lowerLine.includes('ok')) {
        return { severity: 'success', style: { ...baseStyle, color: '#4caf50', borderLeftColor: '#4caf50' }, icon: <MuiCheckCircleOutline sx={iconSx} /> };
    }
    if (lowerLine.includes('info')) {
        return { severity: 'info', style: { ...baseStyle, color: '#2196f3', borderLeftColor: '#2196f3' }, icon: <InfoOutlined sx={iconSx} /> };
    }
    if (line.trim()) { // Only for non-empty lines
        return { severity: 'other', style: { ...baseStyle, color: 'inherit', borderLeftColor: '#e0e0e0' }, icon: <Box sx={{ ...iconSx, width: '1.1rem' }} /> }; // Placeholder for alignment
    }
    return { severity: 'empty', style: { ...baseStyle, borderLeft: 'none' }, icon: null }; // No border for empty lines
};

function ApplicationLogsDialog({ open, onClose, appName, customerId, serverId }) {
    const [logs, setLogs] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [summary, setSummary] = useState('');
    const [recommendation, setRecommendation] = useState('');
    const [docLink, setDocLink] = useState(null);
    const [errorCode, setErrorCode] = useState(null);
    const [isAnalysisExpanded, setAnalysisExpanded] = useState(false);
    const [analysisError, setAnalysisError] = useState(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [copySnackbarOpen, setCopySnackbarOpen] = useState(false);
    const [commands, setCommands] = useState([]);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [fixing, setFixing] = useState(false);
    const [fixResult, setFixResult] = useState(null);
    const [showAllLogs, setShowAllLogs] = useState(false);
    const [liveMode, setLiveMode] = useState(false);
    const [severityFilter, setSeverityFilter] = useState({
        error: true,
        warning: true,
        success: true,
        info: true,
        other: true,
    });

    const fetchLogs = React.useCallback(async (isInitialLoad = false) => {
        if (isInitialLoad) {
            setLoading(true);
        }
        setError(null);
        try {
            const response = await api.post(`/customers/${customerId}/servers/${serverId}/installed-applications/${appName}/application-logs/`, { name: appName });
            if (response.data.logs) {
                setLogs(response.data.logs);
            } else {
                setError('No logs were returned from the server.');
                setLogs('');
            }
        } catch (err) {
            setError(err.response?.data?.error || `Failed to fetch logs for ${appName}.`);
        }
        if (isInitialLoad) {
            setLoading(false);
        }
    }, [appName, customerId, serverId]);

    useEffect(() => {
        if (open) {
            // Reset state when dialog opens
            setLogs('');
            setError(null);
            setSummary('');
            setRecommendation('');
            setAnalysisError(null);
            setCommands([]);
            setFixResult(null);
            setShowAllLogs(false);
            setLiveMode(false);
            
            if (appName) {
                fetchLogs(true);
            }
        }
    }, [open, appName, fetchLogs]);

    useEffect(() => {
        let intervalId;
        if (liveMode && open) {
            intervalId = setInterval(() => fetchLogs(false), 5000); // Poll every 5 seconds
        }
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [liveMode, open, fetchLogs]);

    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    };

    const handleCopyAll = () => {
        navigator.clipboard.writeText(logs);
        setCopySnackbarOpen(true);
    };

    const handleDownload = () => {
        const blob = new Blob([logs], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${appName}-logs.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };


    const handleAttemptFix = async () => {
        setConfirmOpen(false);
        setFixing(true);
        setFixResult(null);
        try {
            const response = await api.post(`/customers/${customerId}/servers/${serverId}/execute-fix/`, { commands });
            setFixResult(response.data.results);
        } catch (err) {
            setFixResult([{ 
                command: 'Error',
                stderr: err.response?.data?.error || 'Failed to execute fix.',
                exit_code: 1
            }]);
        }
        setFixing(false);
    };

    const handleAnalyze = async () => {
        setAnalyzing(true);
        setAnalysisError(null);
        setRecommendation('');
        setCommands([]);
        setFixResult(null);
        setErrorCode(null);
        setDocLink(null);
        try {
            const response = await api.post(`/ai/analyze-logs/`, { logs, app_name: appName });
            const recommendationText = response.data.recommendation || '';
            const commandsList = response.data.commands || [];

            console.log('AI Analysis Commands:', commandsList);

            setRecommendation(recommendationText);
            setCommands(commandsList);
            setErrorCode(response.data.error_code || null);
            setDocLink(response.data.doc_link || null);

            if (recommendationText) {
                // Generate a summary from the first line of the recommendation
                const firstLine = recommendationText.split('\n')[0].replace(/^[0-9]+\.\s*/, '');
                setSummary(firstLine);
                setAnalysisExpanded(true); // Expand the section to show the result
            } else {
                setSummary('');
                setAnalysisExpanded(false);
            }
        } catch (err) {
            setAnalysisError(err.response?.data?.error || 'Failed to get AI analysis.');
        }
        setAnalyzing(false);
    };

    const LOG_DISPLAY_LIMIT = 15;
    const handleFilterChange = (event) => {
        setSeverityFilter({
            ...severityFilter,
            [event.target.name]: event.target.checked,
        });
    };

    const severityOrder = { error: 1, warning: 2, success: 3, info: 4, other: 5, empty: 6 };

    const processedLogs = (logs ? logs.split('\n') : [])
        .map((line, index) => ({ line, index, ...getLogLineInfo(line) }))
        .filter(log => log.severity === 'empty' || severityFilter[log.severity])
        .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    const displayedLogLines = showAllLogs ? processedLogs : processedLogs.slice(-LOG_DISPLAY_LIMIT);

    const markdownComponents = {
        h6: ({node, ...props}) => <Typography variant="h6" sx={{ mt: 2, mb: 1 }} {...props} />,
        p: ({node, ...props}) => <Typography variant="body1" sx={{ mb: 1 }} {...props} />,
        ol: ({node, ...props}) => <Box component="ol" sx={{ pl: 3, mb: 1 }} {...props} />,
        li: ({node, ...props}) => <Typography component="li" sx={{ mb: 1 }} {...props} />,
        pre: ({ node, children, ...props }) => {
            const codeText = String(children).replace(/\n$/, '');
            const handleCopy = () => {
                navigator.clipboard.writeText(codeText);
                setSnackbarOpen(true);
            };

            return (
                <Box sx={{ position: 'relative', my: 1 }}>
                    <IconButton
                        size="small"
                        onClick={handleCopy}
                        sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            color: '#f1f1f1',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            },
                        }}
                    >
                        <ContentCopy fontSize="inherit" />
                    </IconButton>
                    <pre {...props} style={{
                        backgroundColor: '#1e1e1e',
                        padding: '16px',
                        paddingTop: '40px',
                        borderRadius: '4px',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        fontFamily: 'monospace'
                    }}>
                        {children}
                    </pre>
                </Box>
            );
        },
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" PaperProps={{ sx: { backgroundColor: '#2d2d2d', color: '#f1f1f1' } }}>
            <DialogTitle sx={{ borderBottom: '1px solid #444' }}>Logs for {appName}</DialogTitle>
            <DialogContent>
                {/* Application Logs Section */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="h6" component="div" sx={{ color: '#f1f1f1', mr: 1 }}>
                            📄 Application Logs
                        </Typography>
                        <IconButton onClick={() => fetchLogs(true)} size="small" title="Refresh Logs" disabled={loading || liveMode}>
                            <RefreshIcon />
                        </IconButton>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <FormGroup row>
                            {Object.keys(severityFilter).map(level => (
                                <FormControlLabel
                                    key={level}
                                    control={<Checkbox checked={severityFilter[level]} onChange={handleFilterChange} name={level} size="small" />}
                                    label={level.charAt(0).toUpperCase() + level.slice(1)}
                                    sx={{ textTransform: 'capitalize' }}
                                />
                            ))}
                        </FormGroup>
                        <FormControlLabel
                            control={<Switch checked={liveMode} onChange={(e) => setLiveMode(e.target.checked)} name="liveMode" />}
                            label="Live Mode"
                            sx={{ ml: 2 }}
                        />
                    </Box>
                </Box>
                <Box sx={{
                    p: 2,
                    backgroundColor: '#1e1e1e',
                    color: '#d4d4d4',
                    fontFamily: 'monospace',
                    borderRadius: '4px',
                    maxHeight: '45vh',
                    overflowY: 'auto',
                    border: '1px solid #444',
                    mb: 2
                }}>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <CircularProgress />
                        </Box>
                    ) : error ? (
                        <Alert severity="error" sx={{
                            backgroundColor: 'rgba(255, 82, 82, 0.1)',
                            color: '#f44336'
                        }}>{error}</Alert>
                    ) : (
                        <>
                            {displayedLogLines.map(({ line, style, icon, index }) => (
                                <Box component="div" key={index} sx={style}>
                                    {icon}
                                    <span>{line}</span>
                                </Box>
                            ))}
                        </>
                    )}
                </Box>
                {processedLogs.length > LOG_DISPLAY_LIMIT && (
                    <Button
                        size="small"
                        onClick={() => setShowAllLogs(!showAllLogs)}
                        sx={{ textTransform: 'none', mb: 2, alignSelf: 'flex-start' }}
                    >
                        {showAllLogs ? 'Show less' : `Show ${processedLogs.length - LOG_DISPLAY_LIMIT} more lines...`}
                    </Button>
                )}

                {/* AI Analysis Section */}
                {(analyzing || analysisError || recommendation) && <Divider sx={{ my: 2, borderColor: '#444' }} />}

                <Box sx={{ mt: 2 }}>
                    {summary && (
                        <Paper elevation={3} sx={{ p: 2, mt: 2, backgroundColor: '#3c3c3c' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => setAnalysisExpanded(!isAnalysisExpanded)}>
                                <Typography variant="body1" sx={{ flexGrow: 1 }}><strong>🧠 AI Analysis:</strong> {summary}</Typography>
                                <IconButton size="small">
                                    <ExpandMoreIcon sx={{ transform: isAnalysisExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }} />
                                </IconButton>
                            </Box>
                            <Collapse in={isAnalysisExpanded} timeout="auto" unmountOnExit>
                                <Divider sx={{ my: 1 }} />
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={markdownComponents}
                                >
                                    {recommendation}
                                </ReactMarkdown>
                                {docLink && (
                                    <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid #333' }}>
                                        <Typography variant="body2">
                                            📖 Learn more: <a href={docLink} target="_blank" rel="noopener noreferrer" style={{ color: '#64b5f6' }}>{docLink}</a>
                                        </Typography>
                                    </Box>
                                )}
                            </Collapse>
                        </Paper>
                    )}

                    {analyzing && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, p: 2, backgroundColor: '#3c3c3c', borderRadius: 2 }}>
                            <CircularProgress size={24} sx={{ mr: 2 }} />
                            <Typography>Analyzing logs, please wait...</Typography>
                        </Box>
                    )}

                    {analysisError && (
                        <Alert severity="error" sx={{ mt: 2 }}>{analysisError}</Alert>
                    )}

                    {fixing && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, p: 2, backgroundColor: '#3c3c3c', borderRadius: 2 }}>
                            <CircularProgress size={24} sx={{ mr: 2 }} />
                            <Typography>Attempting fix, please wait...</Typography>
                        </Box>
                    )}

                    {fixResult && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="h6" gutterBottom>Fix Execution Result</Typography>
                            <Paper elevation={3} sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #444' }}>
                                {fixResult.map((res, index) => (
                                    <Box key={index} sx={{ mb: 2 }}>
                                        <Typography variant="body1" sx={{ fontFamily: 'monospace', color: res.exit_code === 0 ? '#4caf50' : '#f44336' }}>
                                            $ {res.command}
                                        </Typography>
                                        {res.stdout && <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#d4d4d4' }}>{res.stdout}</pre>}
                                        {res.stderr && <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#f44336' }}>{res.stderr}</pre>}
                                    </Box>
                                ))}
                            </Paper>
                        </Box>
                    )}
                </Box>
            </DialogContent>
            <DialogActions sx={{ borderTop: '1px solid #444', pt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Button onClick={handleCopyAll} disabled={!logs || loading} sx={{ color: '#f1f1f1' }}>
                        Copy All
                    </Button>
                    <Button onClick={handleDownload} disabled={!logs || loading} sx={{ color: '#f1f1f1' }}>
                        Download
                    </Button>
                    <Button onClick={handleAnalyze} disabled={!logs || analyzing || loading || fixing} sx={{ color: '#f1f1f1' }}>
                        Analyze Logs with AI
                    </Button>
                    {commands.length > 0 && (
                        <Button 
                            variant="contained" 
                            color="secondary" 
                            onClick={() => setConfirmOpen(true)} 
                            disabled={fixing || analyzing}
                            sx={{ ml: 2 }}
                        >
                            🛠️ Attempt Fix
                        </Button>
                    )}
                </Box>
                <Button onClick={onClose} sx={{ color: '#f1f1f1' }}>Close</Button>
            </DialogActions>

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={3000}
                onClose={handleCloseSnackbar}
                message="Command copied to clipboard!"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                action={
                    <IconButton size="small" aria-label="close" color="inherit" onClick={handleCloseSnackbar}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                }
            />

            <Snackbar
                open={copySnackbarOpen}
                autoHideDuration={3000}
                onClose={() => setCopySnackbarOpen(false)}
                message="Logs copied to clipboard!"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                action={
                    <IconButton size="small" aria-label="close" color="inherit" onClick={() => setCopySnackbarOpen(false)}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                }
            />

            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} PaperProps={{ sx: { backgroundColor: '#2d2d2d', color: '#f1f1f1' } }}>
                <DialogTitle>Confirm Fix</DialogTitle>
                <DialogContent>
                    <Typography>The following commands will be executed on your server:</Typography>
                    <Paper sx={{ p: 2, mt: 2, backgroundColor: '#1e1e1e' }}>
                        {commands.map((cmd, i) => (
                            <Typography key={i} sx={{ fontFamily: 'monospace' }}>{cmd}</Typography>
                        ))}
                    </Paper>
                    <Alert severity="warning" sx={{ mt: 2 }}>
                        Please ensure you understand these commands before proceeding. Running incorrect commands could harm your server.
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
                    <Button onClick={handleAttemptFix} color="secondary" variant="contained">Execute</Button>
                </DialogActions>
            </Dialog>
        </Dialog>
    );
}

export default ApplicationLogsDialog;
