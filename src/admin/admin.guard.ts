import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common'

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
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
