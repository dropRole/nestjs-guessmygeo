import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Action } from './action.entity';
import { Repository, Like, DeleteResult } from 'typeorm';
import { ActionRecordDTO } from './dto/action-record.dto';
import { User } from '../auth/user.entity';
import { ActionsFilterDTO } from './dto/actions-filter.dto';
import { UtilityLoggerService } from '../logger/logger.service';

@Injectable()
export class ActionsService {
  constructor(
    @InjectRepository(Action)
    private actionsRepo: Repository<Action>,
    private utilityLoggerService: UtilityLoggerService,
  ) {
    this.utilityLoggerService.setContext('ActionsService');
  }

  async recordAction(
    user: User,
    actionRecordDTO: ActionRecordDTO,
  ): Promise<void> {
    const { type, component, value, url } = actionRecordDTO;

    const action: Action = this.actionsRepo.create({
      type,
      component,
      value: value ? value : null,
      url,
      user,
    });

    try {
      await this.actionsRepo.insert(action);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }

    this.utilityLoggerService.instanceCreationLog(action);
  }

  async selectActions(actionsFilterDTO: ActionsFilterDTO): Promise<Action[]> {
    const { limit, search } = actionsFilterDTO;

    try {
      const actions: Action[] = await this.actionsRepo.find({
        loadEagerRelations: true,
        where: search ? { user: Like(`%${search}%`) } : {},
        take: limit,
        order: { performedAt: 'DESC' },
      });

      this.utilityLoggerService.instanceSelectionLog('Action', limit);

      return actions;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async removeAction(id: string): Promise<boolean> {
    let result: DeleteResult;
    try {
      result = await this.actionsRepo.delete(id);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }

    this.utilityLoggerService.instanceDeletionLog('Action', result.affected);

    // nought deleted
    if (!result.affected) return false;

    return true;
  }
}
