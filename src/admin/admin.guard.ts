import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common'
import { RateLimitService } from '../security/rate-limit.service'

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly rateLimitService: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()

    await this.rateLimitService.assertWithinLimit({
      request,
      scope: 'admin-panel-ip',
      max: 600,
      windowSeconds: 60,
    })

    const key = request.headers['x-admin-key']

    if (!process.env.ADMIN_KEY) {
      throw new UnauthorizedException('ADMIN_KEY no configurada en el servidor.')
    }

    if (key !== process.env.ADMIN_KEY) {
      throw new UnauthorizedException('Clave de administrador inválida.')
    }

    return true
  }
}
