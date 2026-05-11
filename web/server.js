const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')
const os = require('os')

// Rileva l'IP LAN della macchina (es. 192.168.1.x)
const nets = Object.values(os.networkInterfaces() || {}).flat()
const lanIP = nets.find(n => n && n.family === 'IPv4' && !n.internal)?.address || 'localhost'

const port = process.env.PORT || 3000

// DEVE essere impostato PRIMA che Next.js carichi NextAuth, altrimenti getServerSession() lancia "Invalid URL"
if (!process.env.NEXTAUTH_URL || process.env.NEXTAUTH_URL === '') {
  process.env.NEXTAUTH_URL = `http://${lanIP}:${port}`
  console.log(`> NEXTAUTH_URL impostato automaticamente: ${process.env.NEXTAUTH_URL}`)
}

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'  // Ascolta su tutta la rete
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  })

  io.on('connection', (socket) => {
    console.log('[Socket] Client connected:', socket.id)

    // Il client (pagina pubblica o scorer) entra nella room del torneo
    socket.on('join-tournament', (tournamentId) => {
      socket.join(`tournament-${tournamentId}`)
      console.log(`[Socket] ${socket.id} joined tournament-${tournamentId}`)
    })

    // Il client entra nella room di una partita specifica (per lo scorer)
    socket.on('join-match', (matchId) => {
      socket.join(`match-${matchId}`)
      console.log(`[Socket] ${socket.id} joined match-${matchId}`)
    })

    // Lo scorer emette ogni punto in tempo reale
    // Viene inoltrato a TUTTI i client (pubblico + altri scorer)
    socket.on('live-point', (data) => {
      console.log(`[Socket] live-point for match ${data.matchId}: ${data.homeCurrentPoints}-${data.awayCurrentPoints}`)
      // Emetti a tutta la room del torneo (il pubblico)
      socket.to(`tournament-${data.tournamentId}`).emit('live-point', data)
      // Emetti anche a chi guarda la stessa partita (altri eventuali scorer)
      socket.to(`match-${data.matchId}`).emit('live-point', data)
    })

    // Evento di aggiornamento finale (quando il punteggio è salvato nel DB)
    socket.on('score-update', (data) => {
      console.log('[Socket] score-update:', data)
      // Broadcast a tutti i client: la pagina pubblica lo usa per refresh finale
      socket.broadcast.emit('score-updated', data)
    })

    socket.on('disconnect', () => {
      console.log('[Socket] Client disconnected:', socket.id)
    })
  })

  server
    .once('error', (err) => {
      console.error(err)
      process.exit(1)
    })
    .listen(port, () => {
      const nets = os.networkInterfaces()
      const lanIPs = Object.values(nets)
        .flat()
        .filter(n => n.family === 'IPv4' && !n.internal)
        .map(n => n.address)

      console.log(`\n> Server locale: http://localhost:${port}`)
      if (lanIPs.length > 0) {
        console.log(`> Da telefono:   http://${lanIPs[0]}:${port}`)
        console.log(`> Admin mobile:  http://${lanIPs[0]}:${port}/admin/login`)
      }
      console.log()
    })
})
