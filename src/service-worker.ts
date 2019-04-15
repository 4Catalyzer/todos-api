/* eslint-disable no-await-in-loop */
/* eslint-env worker */

// eslint-disable-next-line spaced-comment
/// <reference lib="webworker" />

import p2regexp from 'path-to-regexp';

import api from './index';

type Route = [
  RegExp,
  (params: string[], event: FetchEvent) => Promise<Response>
];

function makeResponse(data: any, status = 200) {
  return new Response(data ? JSON.stringify({ data }) : '', { status });
}

const routes: Route[] = [
  [
    p2regexp('/labels/:id?'),

    async ([id], event) => {
      if (event.request.method === 'GET')
        return makeResponse(await (id ? api.getLabel(id) : api.getLabels()));

      const json = await event.request.json();
      return makeResponse(await api.saveLabel(json), id ? 200 : 201);
    },
  ],
  [
    p2regexp('/todos/:id?'),

    async ([id], event) => {
      if (event.request.method === 'GET')
        return makeResponse(await (id ? api.getTodo(id) : api.getTodos()));

      return makeResponse(
        await api.saveTodo(await event.request.json()),
        id ? 200 : 201,
      );
    },
  ],
];

// eslint-disable-next-line no-restricted-globals
self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);

  if (url.hostname !== 'api.todos.com') return;
  const resource = url.pathname.slice('/api/v1'.length);

  for (const [regexp, handler] of routes) {
    const match = regexp.exec(resource);
    if (match) {
      event.respondWith(handler(match.slice(1), event));
      return;
    }
  }
});

self.addEventListener('install', () => {
  // Skip over the "waiting" lifecycle state, to ensure that our
  // new service worker is activated immediately, even if there's
  // another tab open controlled by our older service worker code.
  self.skipWaiting();
});

self.addEventListener('activate', (event: FetchEvent) => {
  event.waitUntil(self.clients.claim());
});
