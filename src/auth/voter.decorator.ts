import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { VoterDocument } from '../schemas/voter.schema'

export const CurrentVoter = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): VoterDocument => {
    const request = ctx.switchToHttp().getRequest()
    return request.voter
  },
)
