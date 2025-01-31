/**
 * TypeScript version of Axios mock for unit testing with [Jest](https://facebook.github.io/jest/).
 * This file is based on https://gist.github.com/tux4/36006a1859323f779ab0
 *
 * @author   knee-cola <nikola.derezic@gmail.com>
 * @license  @license MIT License, http://www.opensource.org/licenses/MIT
 */

import SyncPromise from "jest-mock-promise";
import { AnyFunction, AxiosMockQueueItem, AxiosMockType, HttpResponse, SpyFn } from "./mock-axios-types";

/** a FIFO queue of pending request */
const _pending_requests: AxiosMockQueueItem[] = [];

const _newReq: (url: string, data?: any, config?: any) => SyncPromise = (url: string, data?: any, config?: any) => {
  const promise: SyncPromise = new SyncPromise();
  _pending_requests.push({
    config,
    data,
    promise,
    url,
  });
  return(promise);
};

const MockAxios: AxiosMockType = jest.fn(_newReq) as unknown as AxiosMockType;

// mocking Axios methods
MockAxios.get = jest.fn(_newReq);
MockAxios.post = jest.fn(_newReq);
MockAxios.put = jest.fn(_newReq);
MockAxios.patch = jest.fn(_newReq);
MockAxios.delete = jest.fn(_newReq);
MockAxios.all = jest.fn((values) => Promise.all(values));
MockAxios.head = jest.fn(_newReq);
MockAxios.options = jest.fn(_newReq);
MockAxios.create = jest.fn(() => MockAxios);

MockAxios.interceptors = {
  request: {
    use: jest.fn()
  },
  response: {
    use: jest.fn()
  }
}

MockAxios.popPromise = (promise?: SyncPromise) => {

  if (promise) {
    // remove the promise from pending queue
    for (let ix = 0; ix < _pending_requests.length; ix++) {

      const req: AxiosMockQueueItem = _pending_requests[ix];

      if (req.promise === promise) {
        _pending_requests.splice(ix, 1);
        return(req.promise);
      }
    }

  } else {
    // take the oldest promise
    const req: AxiosMockQueueItem = _pending_requests.shift();
    return(req ? req.promise : void 0);
  }
};

MockAxios.popRequest = (request?: AxiosMockQueueItem) => {

  if (request) {
    const ix = _pending_requests.indexOf(request);
    if (ix === -1) {
      return(void 0);
    }

    _pending_requests.splice(ix, 1);
    return(request);

  } else {
    return(_pending_requests.shift());
  }
};

/**
 * Removes an item form the queue, based on it's type
 * @param queueItem
 */
const popQueueItem = (queueItem: SyncPromise|AxiosMockQueueItem= null) => {
  // first le't pretend the param is a queue item
  const request: AxiosMockQueueItem = MockAxios.popRequest(queueItem as AxiosMockQueueItem);

  if (request) {
  // IF the request was found
  // > set the promise
    return(request.promise);
  } else {
  // ELSE maybe the `queueItem` is a promise (legacy mode)
    return(MockAxios.popPromise(queueItem as SyncPromise));
  }
};

MockAxios.mockResponse = (response?: HttpResponse, queueItem: SyncPromise|AxiosMockQueueItem= null): void => {

  // replacing missing data with default values
  response = Object.assign({
    config: {},
    data: {},
    headers: {},
    status: 200,
    statusText: "OK",
  }, response);

  // resolving the Promise with the given response data
  popQueueItem(queueItem).resolve(response);
};

MockAxios.mockError = (error: any= {}, queueItem: SyncPromise|AxiosMockQueueItem= null) => {
  // resolving the Promise with the given response data
  popQueueItem(queueItem).reject(Object.assign({}, error));
};

MockAxios.lastReqGet = () => {
  return(_pending_requests[_pending_requests.length - 1]);
};

MockAxios.lastPromiseGet = () => {
  const req = MockAxios.lastReqGet();
  return(req ? req.promise : void 0);
};

MockAxios.reset = () => {
  // remove all the requests
  _pending_requests.splice(0, _pending_requests.length);

  // resets all information stored in the mockFn.mock.calls and mockFn.mock.instances arrays
  MockAxios.get.mockClear();
  MockAxios.post.mockClear();
  MockAxios.put.mockClear();
  MockAxios.patch.mockClear();
  MockAxios.delete.mockClear();
  MockAxios.head.mockClear();
  MockAxios.options.mockClear();
  MockAxios.all.mockClear();
};

// this is a singleton object
export default MockAxios;
