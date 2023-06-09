import { Test, TestingModule } from '@nestjs/testing';
import { ActionsController } from './actions.controller';
import { ModuleMocker, MockFunctionMetadata, Mock } from 'jest-mock';
import { Action } from './action.entity';
import { ActionType } from './enum/action-type.enum';
import { users } from '../auth/auth.controller.spec';
import { ActionsService } from './actions.service';
import { ActionRecordDTO } from './dto/action-record.dto';
import { User } from '../auth/user.entity';
import { ActionsFilterDTO } from './dto/actions-filter.dto';
import { NotFoundException } from '@nestjs/common';

const moduleMocker: ModuleMocker = new ModuleMocker(global);

const actions: Action[] = [
  {
    id: crypto.randomUUID(),
    type: ActionType.CLICK,
    component: '<button>',
    performedAt: new Date(),
    value: undefined,
    url: 'http://guessmygeo.com',
    user: users[0],
  },
  {
    id: crypto.randomUUID(),
    type: ActionType.SCROLL,
    component: '<section>',
    performedAt: new Date(),
    value: '{ SCROLL_PAGE_UP: 150, SCROLL_PAGE_DOWN: 150 }',
    url: 'http://guessmygeo.com/locations',
    user: users[0],
  },
  {
    id: crypto.randomUUID(),
    type: ActionType.INPUT,
    component: '<input>',
    performedAt: new Date(),
    value: 'City has an eye',
    url: 'http://guessmygeo.com/locations',
    user: users[1],
  },
];

describe('ActionsController', () => {
  let controller: ActionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActionsController],
    })
      .useMocker((token) => {
        // ActionsService dependency injection
        if (token === ActionsService)
          return {
            recordAction: jest
              .fn()
              .mockImplementation(
                (user: User, actionRecordDTO: ActionRecordDTO) => {
                  const action: Action = {
                    id: crypto.randomUUID(),
                    ...actionRecordDTO,
                    performedAt: new Date(),
                    user,
                  };

                  actions.push(action);
                },
              ),
            selectActions: jest
              .fn()
              .mockImplementation((actionsFilterDTO: ActionsFilterDTO) => {
                const { limit, search } = actionsFilterDTO;

                return actions
                  .filter((action) =>
                    action.user.username
                      .toUpperCase()
                      .includes(search.toUpperCase()),
                  )
                  .slice(0, limit);
              }),
            removeAction: jest
              .fn()
              .mockImplementation((id: string): boolean => {
                let removed = false;

                if (actions.find((action) => action.id === id)) {
                  actions.splice(
                    actions.indexOf(actions.find((action) => action.id === id)),
                    1,
                  );

                  removed = true;
                }

                // nought deletions made
                if (!removed)
                  throw new NotFoundException(`Action ${id} was not found.`);

                return removed;
              }),
          };

        const mockMetadata: MockFunctionMetadata = moduleMocker.getMetadata(
          token,
        ) as MockFunctionMetadata;

        const MockDependency: Mock =
          moduleMocker.generateFromMetadata(mockMetadata);

        return new MockDependency();
      })
      .compile();

    controller = module.get<ActionsController>(ActionsController);
  });

  describe('recordAction', () => {
    it('should be void', () => {
      const actionRecordDTO: ActionRecordDTO = new ActionRecordDTO();
      actionRecordDTO.type = ActionType.CLICK;
      actionRecordDTO.component = '<button>';
      actionRecordDTO.value = undefined;
      actionRecordDTO.url = 'http://guessmygeo.com';

      expect(
        controller.recordAction(users[0], actionRecordDTO),
      ).toBeUndefined();
    });
  });

  describe('selectActions', () => {
    it('should return an array of Action instances', () => {
      const actionsFilterDTO: ActionsFilterDTO = new ActionsFilterDTO();
      actionsFilterDTO.limit = 5;
      actionsFilterDTO.search = 'laRAD';

      expect(controller.selectActions(actionsFilterDTO)).toBeInstanceOf(
        Array<Action>,
      );
    });
  });

  describe('removeAction', () => {
    it('should be truthy', () => {
      expect(controller.removeAction(actions[0].id)).toBeTruthy();
    });

    it('should throw a NotFoundException', () => {
      const id: string = actions[1].id.substring(0, actions[1].id.length - 1);

      expect(() => controller.removeAction(id)).toThrow(
        `Action ${id} was not found.`,
      );
    });
  });
});
