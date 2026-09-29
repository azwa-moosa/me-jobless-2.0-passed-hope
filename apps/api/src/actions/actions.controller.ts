import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { SecurityContext } from '@bml/policy';
import { Ctx, Requires } from '../auth/decorators';
import { ActionsService, ActionView } from './actions.service';

@Controller('actions')
export class ActionsController {
  constructor(private actions: ActionsService) {}

  @Get() @Requires('actions.use')
  list(@Ctx() ctx: SecurityContext, @Query('view') view: ActionView = 'my') { return this.actions.list(ctx, view); }

  @Get('summary') @Requires('actions.use')
  summary(@Ctx() ctx: SecurityContext) { return this.actions.summary(ctx); }

  @Post() @Requires('actions.create')
  create(@Ctx() ctx: SecurityContext, @Body() body: any) { return this.actions.create(ctx, body ?? {}); }

  @Get(':id') @Requires('actions.use')
  get(@Ctx() ctx: SecurityContext, @Param('id', ParseUUIDPipe) id: string) { return this.actions.get(ctx, id); }

  @Post(':id/transition') @HttpCode(200) @Requires('actions.use')
  transition(@Ctx() ctx: SecurityContext, @Param('id', ParseUUIDPipe) id: string, @Body() body: any) { return this.actions.transition(ctx, id, body ?? {}); }

  @Post(':id/assign') @HttpCode(200) @Requires('actions.reassign')
  assign(@Ctx() ctx: SecurityContext, @Param('id', ParseUUIDPipe) id: string, @Body() body: any) { return this.actions.assign(ctx, id, body ?? {}); }
}
