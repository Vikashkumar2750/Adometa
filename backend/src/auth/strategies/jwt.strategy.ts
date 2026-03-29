import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            // Ensure specific string return type or throw
            secretOrKey: configService.get<string>('JWT_SECRET') || 'FALLBACK_SECRET_SHOULD_NOT_HAPPEN',
        });
    }

    async validate(payload: any) {
        if (!payload.sub || !payload.email) {
            throw new UnauthorizedException('Invalid token');
        }
        // Return user object attached to request.
        // Expose BOTH `sub` and `userId` so controllers using either field work correctly.
        return {
            sub: payload.sub,        // used throughout controllers as req.user.sub
            userId: payload.sub,     // alias for convenience
            id: payload.sub,         // alias for convenience
            email: payload.email,
            name: payload.name,
            role: payload.role,
            tenantId: payload.tenantId,
        };
    }
}
