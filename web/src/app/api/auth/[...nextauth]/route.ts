import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "admin" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null
        }
        
        const user = await prisma.user.findUnique({
          where: { username: credentials.username }
        });

        // Se non ci sono utenti nel db, crea un admin di default alla prima login
        const usersCount = await prisma.user.count();
        if (usersCount === 0 && credentials.username === 'admin') {
           const hashedPassword = await bcrypt.hash(credentials.password, 10);
           const newUser = await prisma.user.create({
             data: {
               username: 'admin',
               password: hashedPassword
             }
           });
           return { id: newUser.id, name: newUser.username };
        }

        if (!user) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

        if (!isPasswordValid) {
          return null
        }

        return { id: user.id, name: user.username }
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: '/admin/login',
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.name = token.name;
        // session.user.id = token.sub; // Aggiungere tipizzazione in produzione
      }
      return session;
    }
  }
})

export { handler as GET, handler as POST }
