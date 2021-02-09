import qs from "qs";

function buildRequest(url, { body, method, ...msg }) {
	if (!body) {
		return [url, { method, ...msg }];
	}

	if (method === "GET") {
		if (typeof body === "object") {
			return [`${url}?${qs.stringify(body)}`, { method, ...msg }];
		} else {
			return [`${url}#${body}`, { method, ...msg }];
		}
	} else {
		if (typeof body === "string") {
			return [url, { method, body, ...msg }];
		} else {
			return [url, { method, body: JSON.stringify(body), ...msg }];
		}
	}
}

export default function fetchTransport(dispatch) {
	return {
		match: ({ snk }) => /^https?:\/\//.test(snk),
		handle: ({ snk, src, msg }) => {
			const [url, init] = buildRequest(snk, msg);

			fetch(url, init).then((response, error) => {
				if (error) {
					dispatch(src, { type: "FETCH_REJECT", error });
				} else {
					response
						.json()
						.catch(() => response.text())
						.then((body) => {
							dispatch(src, {
								type: "FETCH_RESPOND",
								src: snk,

								body,

								ok: response.ok,
								status: response.status,
								statusText: response.statusText,
								url: response.url,

								headers: Object.fromEntries(
									response.headers.entries(),
								),
							});
						});
				}
			});
		},
	};
}
