/**
 * @jest-environment node
 */

import "babel-polyfill";
import fetch from "node-fetch";

import http from "http";

import createActorSystem from "@little-bonsai/ingrates";

import fetchTransport from "../src";

function pause() {
	return new Promise((done) => setTimeout(done, 100));
}

describe("fetchTransport", () => {
	let server;
	const apiCallMock = jest.fn();

	beforeAll((done) => {
		global.fetch = fetch;

		server = http.createServer((req, res) => {
			apiCallMock(req.method, req.url, req.body);

			res.writeHead(200, {
				"Content-Type": "application/json",
				"x-test-header": "Built with ingrates",
			});

			res.end(JSON.stringify({ test }));
		});

		server.listen(54321, "127.0.0.1", done);
	});

	afterAll((done) => {
		server.close(done);
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	it("can query a server", (done) => {
		createActorSystem({ transports: [fetchTransport] })(
			async function* TestActor({ spawn, dispatch }) {
				dispatch("http://127.0.0.1:54321", { method: "GET" });

				await pause();

				expect(apiCallMock).toHaveBeenCalledTimes(1);
				expect(apiCallMock).toHaveBeenCalledWith("GET", "/", undefined);

				done();
			},
		);
	});

	it("will deliver the message to the specified path", () => {});

	it("will deliver the response from the server to the actor", () => {});
	it("will deliver the response to the actor that initialy sent the request", () => {});

	describe("GET", () => {
		it("will encode an object body to a query string", () => {});
		it("will encode a string body to a hashcode", () => {});
	});

	describe("PUT/POST", () => {
		it("will encode an object body with JSON.stringify", () => {});
		it("will encode a string body as is", () => {});
	});

	it("the response will contain the response code", () => {});
	it("the response will contain the response headers", () => {});
	it("the response will contain the body as json if possible", () => {});
	it("the response will contain the body as text as a fallback", () => {});
});
