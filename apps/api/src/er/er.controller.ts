import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { SecurityContext } from '@bml/policy';
import { Ctx, Requires } from '../auth/decorators';
import { ErService } from './er.service';

@Controller('er')
export class ErController {
  constructor(private er: ErService) {}

  @Get('dashboard') @Requires('er.dashboard.read')
  dashboard(@Ctx() ctx: SecurityContext) { return this.er.dashboard(ctx); }

  @Get('cases') @Requires('er.case.read')
  list(@Ctx() ctx: SecurityContext, @Query('status') status?: string) { return this.er.list(ctx, status); }

  @Post('cases') @Requires('er.case.create')
  create(@Ctx() ctx: SecurityContext, @Body() body: any) { return this.er.create(ctx, body ?? {}); }

  @Get('cases/:id') @Requires('er.case.read')
  get(@Ctx() ctx: SecurityContext, @Param('id') id: string) { return this.er.get(ctx, id); }

  @Get('cases/:id/timeline') @Requires('er.case.read')
  timeline(@Ctx() ctx: SecurityContext, @Param('id') id: string) { return this.er.timeline(ctx, id); }

  @Post('cases/:id/timeline') @Requires('er.case.update')
  addEvent(@Ctx() ctx: SecurityContext, @Param('id') id: string, @Body() body: any) { return this.er.addEvent(ctx, id, body ?? {}); }

  @Post('cases/:id/timeline/:eventId/amend') @Requires('er.case.update')
  amend(@Ctx() ctx: SecurityContext, @Param('id') id: string, @Param('eventId') eventId: string, @Body() body: any) { return this.er.amendEvent(ctx, id, eventId, body ?? {}); }

  @Post('cases/:id/status') @HttpCode(200) @Requires('er.case.status')
  status(@Ctx() ctx: SecurityContext, @Param('id') id: string, @Body() body: any) { return this.er.changeStatus(ctx, id, body ?? {}); }

  @Post('cases/:id/close') @HttpCode(200) @Requires('er.case.close')
  close(@Ctx() ctx: SecurityContext, @Param('id') id: string, @Body() body: any) { return this.er.close(ctx, id, body ?? {}); }

  @Post('cases/:id/team') @Requires('er.case.team.manage')
  addMember(@Ctx() ctx: SecurityContext, @Param('id') id: string, @Body() body: any) { return this.er.addMember(ctx, id, body ?? {}); }

  @Delete('cases/:id/team/:userId') @Requires('er.case.team.manage')
  removeMember(@Ctx() ctx: SecurityContext, @Param('id') id: string, @Param('userId') userId: string, @Query('reason') reason?: string) {
    return this.er.removeMember(ctx, id, userId, reason);
  }

  @Get('cases/:id/tasks') @Requires('er.case.read')
  tasks(@Ctx() ctx: SecurityContext, @Param('id') id: string) { return this.er.tasks(ctx, id); }

  @Post('cases/:id/tasks') @Requires('er.case.update')
  addTask(@Ctx() ctx: SecurityContext, @Param('id') id: string, @Body() body: any) { return this.er.addTask(ctx, id, body ?? {}); }

  @Get('cases/:id/access-log') @Requires('er.case.access_log.read')
  accessLog(@Ctx() ctx: SecurityContext, @Param('id') id: string) { return this.er.accessLog(ctx, id); }
}
