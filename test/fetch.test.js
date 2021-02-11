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
			const bodyBuffer = [];
			req.on("data", (chunk) => {
				bodyBuffer.push(chunk);
			}).on("end", () => {
				const body = Buffer.concat(bodyBuffer).toString();

				apiCallMock(req.method, req.url, body);

				try {
					const parsedBody = JSON.parse(body);

					res.writeHead(200, {
						"Content-Type": "application/json",
						"x-test-header": "Built with ingrates",
					});

					if (parsedBody.pleaseReply) {
						res.end(parsedBody.pleaseReply);
					} else {
						res.end(
							JSON.stringify({
								reversed: (
									parsedBody.pleaseReverse || []
								).reverse(),
							}),
						);
					}
				} catch (e) {
					res.writeHead(200, {
						"Content-Type": "application/json",
						"x-test-header": "Built with ingrates",
					});

					res.end(JSON.stringify({ placeholder: true }));
				}
			});
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
				expect(apiCallMock).toHaveBeenCalledWith("GET", "/", "");

				done();
			},
		);
	});

	it("will deliver the message to the specified path", (done) => {
		createActorSystem({ transports: [fetchTransport] })(
			async function* TestActor({ spawn, dispatch }) {
				dispatch("http://127.0.0.1:54321/some/path/here", {
					method: "GET",
				});

				await pause();

				expect(apiCallMock).toHaveBeenCalledTimes(1);
				expect(apiCallMock).toHaveBeenCalledWith(
					"GET",
					"/some/path/here",
					"",
				);

				done();
			},
		);
	});

	it("will deliver the response from the server to the actor", (done) => {
		createActorSystem({ transports: [fetchTransport] })(
			async function* TestActor({ spawn, dispatch }) {
				dispatch("http://127.0.0.1:54321/test-actor", {
					method: "POST",
					body: { pleaseReverse: [1, 2, 3] },
				});

				const msg = yield;

				expect(apiCallMock).toHaveBeenCalledTimes(1);
				expect(apiCallMock).toHaveBeenCalledWith(
					"POST",
					"/test-actor",
					'{"pleaseReverse":[1,2,3]}',
				);

				expect(msg).toMatchObject({
					type: "FETCH_RESPOND",
					body: { reversed: [3, 2, 1] },
				});

				done();
			},
		);
	});

	it("will deliver the response to the actor that initialy sent the request", (done) => {
		expect.assertions(3);

		function* ApiCallingActor({ parent, dispatch }) {
			while (true) {
				const msg = yield;

				if (msg.type === "DO_THAT_SWEET_SWEET_QUERY") {
					dispatch("http://127.0.0.1:54321/test-actor", {
						method: "POST",
						body: { pleaseReverse: [1, 2, 3] },
					});
				}

				if (msg.type === "FETCH_RESPOND") {
					expect(msg).toMatchObject({
						type: "FETCH_RESPOND",
						body: { reversed: [3, 2, 1] },
					});

					dispatch(parent, { type: "DONE" });
					break;
				}
			}
		}

		createActorSystem({ transports: [fetchTransport] })(
			async function* TestActor({ spawn, dispatch }) {
				const apiCallingActor = spawn(ApiCallingActor);
				dispatch(apiCallingActor, {
					type: "DO_THAT_SWEET_SWEET_QUERY",
				});

				yield;

				expect(apiCallMock).toHaveBeenCalledTimes(1);
				expect(apiCallMock).toHaveBeenCalledWith(
					"POST",
					"/test-actor",
					'{"pleaseReverse":[1,2,3]}',
				);

				done();
			},
		);
	});

	describe("GET", () => {
		it("will encode an object body to a query string", (done) => {
			createActorSystem({ transports: [fetchTransport] })(
				async function* TestActor({ spawn, dispatch }) {
					dispatch("http://127.0.0.1:54321/some/path/here", {
						method: "GET",
						body: { queryString: 123 },
					});

					await pause();

					expect(apiCallMock).toHaveBeenCalledTimes(1);
					expect(apiCallMock).toHaveBeenCalledWith(
						"GET",
						"/some/path/here?queryString=123",
						"",
					);

					done();
				},
			);
		});

		it("will ignore non-object bodys", (done) => {
			createActorSystem({ transports: [fetchTransport] })(
				async function* TestActor({ spawn, dispatch }) {
					dispatch("http://127.0.0.1:54321/some/path/here", {
						method: "GET",
						body: "ABC",
					});

					await pause();

					expect(apiCallMock).toHaveBeenCalledTimes(1);
					expect(apiCallMock).toHaveBeenCalledWith(
						"GET",
						"/some/path/here",
						"",
					);

					done();
				},
			);
		});
	});

	describe("PUT/POST", () => {
		it("will encode an object body with JSON.stringify", (done) => {
			createActorSystem({ transports: [fetchTransport] })(
				async function* TestActor({ spawn, dispatch }) {
					dispatch("http://127.0.0.1:54321/some/path/here", {
						method: "POST",
						body: { query: 123 },
					});

					await pause();

					expect(apiCallMock).toHaveBeenCalledTimes(1);
					expect(apiCallMock).toHaveBeenCalledWith(
						"POST",
						"/some/path/here",
						'{"query":123}',
					);

					done();
				},
			);
		});

		it("will encode a string body as is", (done) => {
			createActorSystem({ transports: [fetchTransport] })(
				async function* TestActor({ spawn, dispatch }) {
					dispatch("http://127.0.0.1:54321/some/path/here", {
						method: "PUT",
						body: "ABC",
					});

					await pause();

					expect(apiCallMock).toHaveBeenCalledTimes(1);
					expect(apiCallMock).toHaveBeenCalledWith(
						"PUT",
						"/some/path/here",
						"ABC",
					);

					done();
				},
			);
		});
	});

	it("the response will contain the response code", (done) => {
		createActorSystem({ transports: [fetchTransport] })(
			async function* TestActor({ spawn, dispatch }) {
				dispatch("http://127.0.0.1:54321/test-actor", {
					method: "GET",
				});

				const msg = yield;

				expect(msg).toMatchObject({
					type: "FETCH_RESPOND",
					ok: true,
					status: 200,
				});

				done();
			},
		);
	});

	it("the response will contain the response headers", (done) => {
		createActorSystem({ transports: [fetchTransport] })(
			async function* TestActor({ spawn, dispatch }) {
				dispatch("http://127.0.0.1:54321/test-actor", {
					method: "GET",
				});

				const msg = yield;

				expect(msg).toMatchObject({
					type: "FETCH_RESPOND",
					headers: {
						connection: "close",
						"content-type": "application/json",
						"transfer-encoding": "chunked",
						"x-test-header": "Built with ingrates",
					},
				});

				done();
			},
		);
	});

	it("the response will contain the body as json if possible", (done) => {
		createActorSystem({ transports: [fetchTransport] })(
			async function* TestActor({ spawn, dispatch }) {
				dispatch("http://127.0.0.1:54321/test-actor", {
					method: "POST",
					body: { pleaseReverse: [1, 2, 3] },
				});

				const msg = yield;

				expect(msg).toMatchObject({
					type: "FETCH_RESPOND",
					body: { reversed: [3, 2, 1] },
				});

				done();
			},
		);
	});

	it("the response will contain the body as text as a fallback", (done) => {
		createActorSystem({ transports: [fetchTransport] })(
			async function* TestActor({ spawn, dispatch }) {
				dispatch("http://127.0.0.1:54321/test-actor", {
					method: "POST",
					body: { pleaseReply: "MAJOR TOM" },
				});

				const msg = yield;

				expect(msg).toMatchObject({
					type: "FETCH_RESPOND",
					body: "MAJOR TOM",
				});

				done();
			},
		);
	});
});
