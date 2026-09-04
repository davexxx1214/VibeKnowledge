// Copied to the isolated grader as acceptance.test.ts, not part of the root test suite.
import 'reflect-metadata';
import { join } from 'path';

const target = process.env.AB_WORKSPACE;
if (!target) throw new Error('AB_WORKSPACE is required');
const { TagService } = require(join(target, 'src/tag/tag.service.ts'));
const { TagController } = require(join(target, 'src/tag/tag.controller.ts'));

describe('Independent tag sorting acceptance', () => {
  test.each([
    ['normal', [{ id: 2, tag: 'angular' }, { id: 1, tag: 'react' }]],
    ['empty', []],
    ['duplicate names', [{ id: 8, tag: 'vue' }, { id: 3, tag: 'vue' }]],
  ])('delegates ordering to repository and preserves %s result', async (_name, values) => {
    const find = jest.fn().mockResolvedValue(values);
    const service = new TagService({ find });
    const response = await service.findAll();
    expect(find).toHaveBeenCalledTimes(1);
    expect(find).toHaveBeenCalledWith({ order: { tag: 'ASC' } });
    expect(response).toEqual(values);
  });

  test('repository rejection is not swallowed', async () => {
    const error = new Error('repository unavailable');
    const service = new TagService({ find: jest.fn().mockRejectedValue(error) });
    await expect(service.findAll()).rejects.toBe(error);
  });

  test('controller delegates exactly once and keeps the array response shape', async () => {
    const values = [{ id: 2, tag: 'angular' }, { id: 1, tag: 'react' }];
    const findAll = jest.fn().mockResolvedValue(values);
    const controller = new TagController({ findAll });
    expect(await controller.findAll()).toEqual(values);
    expect(findAll).toHaveBeenCalledTimes(1);
  });

  test('controller propagates service errors', async () => {
    const error = new Error('service unavailable');
    const controller = new TagController({ findAll: jest.fn().mockRejectedValue(error) });
    await expect(controller.findAll()).rejects.toBe(error);
  });
});
