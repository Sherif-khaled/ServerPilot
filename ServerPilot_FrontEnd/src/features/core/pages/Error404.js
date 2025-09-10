import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { keyframes } from '@mui/system';
import { Background, glassCardSx, gradientButtonSx } from '../../../common';

const float = keyframes`
  0% { transform: translateY(0); }
  50% { transform: translateY(-14px); }
  100% { transform: translateY(0); }
`;

const wave = keyframes`
  0% { transform: rotate(0deg); }
  25% { transform: rotate(-18deg); }
  50% { transform: rotate(0deg); }
  75% { transform: rotate(18deg); }
  100% { transform: rotate(0deg); }
`;

export default function Error404() {
  const theme = useTheme();
  const navigate = useNavigate();

  const funnyPhrases = [
    "🧑‍✈️ Captain: 'Arrr! The page ye be seekin’ has sailed away! 🏴‍☠️'",
    "🧑‍✈️ Captain: '404! This page abandoned ship and went fishin’. 🎣'",
    "🧑‍✈️ Captain: 'Ye must be lost, sailor. This harbor doesn’t exist. ⚓'",
    "🧑‍✈️ Captain: 'Shiver me timbers! That page sank to the bottom of the sea. 🌊'",
    "🧑‍✈️ Captain: 'Aye aye! The treasure ye search is not on this island. 🏝️'",
    "🧑‍✈️ Captain: 'Blimey! Ye found the Bermuda Triangle of the internet. 🌀'"
  ];

  const randomPhrase = funnyPhrases[Math.floor(Math.random() * funnyPhrases.length)];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Background />

      <Box
        sx={{
          ...glassCardSx,
          maxWidth: 900,
          width: '95%',
          mx: 'auto',
          my: 'auto',
          textAlign: 'center',
          p: 4,
          position: 'relative',
          overflow: 'visible',
        }}
      >
        {/* Large SVG Captain */}
        <Box
          sx={{
            width: { xs: 220, md: 320 }, // responsive size
            height: 'auto',
            mx: 'auto',
            mb: 2,
            // apply float to the whole svg
            animation: `${float} 3.5s ease-in-out infinite`,
            // style specific parts inside the svg by id
            '& #captain-hat': {
              // subtle tilt
              transformOrigin: '50% 60%',
              transition: 'transform 0.3s',
            },
            '& #captain-arm': {
              transformOrigin: '26% 20%', // set origin near shoulder
              animation: `${wave} 2.2s ease-in-out infinite`,
            }
          }}
          role="img"
          aria-label="Cartoon sea captain waving"
        >
          {/* Inline SVG: simple friendly captain */}
          <svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
            <defs>
              <linearGradient id="skin" x1="0" x2="1">
                <stop offset="0" stopColor="#f3c89a" />
                <stop offset="1" stopColor="#f0b985" />
              </linearGradient>
              <linearGradient id="suit" x1="0" x2="1">
                <stop offset="0" stopColor="#0b5fff" />
                <stop offset="1" stopColor="#0047b3" />
              </linearGradient>
              <linearGradient id="hatGrad" x1="0" x2="1">
                <stop offset="0" stopColor="#ffffff" />
                <stop offset="1" stopColor="#e6e6e6" />
              </linearGradient>
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#000" floodOpacity="0.12"/>
              </filter>
            </defs>

            {/* body & suit */}
            <g filter="url(#shadow)">
              <rect x="30" y="110" rx="18" ry="18" width="140" height="90" fill="url(#suit)" />
            </g>

            {/* left arm (static) */}
            <path d="M40 130 q-10 20 0 40" stroke="#f3c89a" strokeWidth="12" strokeLinecap="round" fill="none" />

            {/* right arm (waving) group with id */}
            <g id="captain-arm">
              <path d="M160 120 q18 10 18 36" stroke="#f3c89a" strokeWidth="12" strokeLinecap="round" fill="none" />
              {/* hand */}
              <circle cx="178" cy="156" r="7" fill="url(#skin)" />
            </g>

            {/* head */}
            <g>
              <circle cx="100" cy="68" r="36" fill="url(#skin)" stroke="#e3a76b" strokeWidth="0.6" />
              {/* beard/mustache */}
              <path d="M76 78 q24 16 48 0" fill="#fff" stroke="#d9d9d9" strokeWidth="2" />
              {/* eye left */}
              <circle cx="88" cy="64" r="3" fill="#2c2c2c" />
              {/* eye right */}
              <circle cx="112" cy="64" r="3" fill="#2c2c2c" />
              {/* smile */}
              <path d="M88 78 q12 8 24 0" stroke="#8b5a3c" strokeWidth="2" fill="none" strokeLinecap="round" />
            </g>

            {/* hat group (id for optional tilt) */}
            <g id="captain-hat">
              <ellipse cx="100" cy="44" rx="46" ry="14" fill="#0b3a66" />
              <rect x="56" y="30" width="88" height="18" rx="4" fill="url(#hatGrad)" />
              <text x="100" y="44" textAnchor="middle" fontSize="10" fill="#0b3a66" fontWeight="700">CAPT</text>
              {/* anchor emblem */}
              <g transform="translate(100,37) scale(0.6) translate(-8,-8)">
                <path d="M8 0 L8 10 M8 10 L2 16 M8 10 L14 16" stroke="#ffd54d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <circle cx="8" cy="16" r="1.6" fill="#ffd54d"/>
              </g>
            </g>

            {/* small boat prop under body for fun */}
            <path d="M45 196 q55 10 110 0 q-20 -10 -90 -10 q-40 0 -20 10" fill="#7fb3ff" opacity="0.9" />
          </svg>
        </Box>

        <Typography variant="h3" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          404 — Lost at Sea
        </Typography>

        {/* Speech bubble */}
        <Box
          sx={{
            display: 'inline-block',
            p: 2.25,
            borderRadius: 3,
            background: theme.palette.background.paper,
            boxShadow: 3,
            position: 'relative',
            mb: 3,
            maxWidth: 640,
            mx: 'auto',
            fontStyle: 'italic',
            color: theme.palette.text.secondary,
            // subtle pop-in animation
            transformOrigin: 'center top',
            animation: `${keyframes`
              0% { opacity: 0; transform: translateY(6px) scale(0.98); }
              100% { opacity: 1; transform: translateY(0) scale(1); }
            `} 500ms ease forwards`
          }}
        >
          <Typography variant="body1">
            {randomPhrase}
          </Typography>

          {/* speech bubble tail */}
          <Box
            sx={{
              position: 'absolute',
              bottom: -10,
              left: '70%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '10px solid transparent',
              borderRight: '10px solid transparent',
              borderTop: `10px solid ${theme.palette.background.paper}`
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => navigate(-1)}
            sx={gradientButtonSx}
          >
            Go Back
          </Button>

           <Button
                      variant="outlined"
                      color="secondary"
                      onClick={() => navigate('/dashboard')}
                      sx={{ borderRadius: 5 }}
                    >
                      Home Port
                    </Button>
        </Box>
      </Box>
    </Box>
  );
}
