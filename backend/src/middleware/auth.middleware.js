import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'focus_intelligence_secret_key_super_secure_jwt_token_2026';
export function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authentication required. No token provided.' });
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        req.user = { id: decoded.userId };
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Invalid or expired authentication token.' });
    }
}
export const requireAuth = authMiddleware;
