import falcon
import json
import store

class MessagesResource:
    def on_get(self, req, resp):
        ms = []
        for m in store.messages.all_messages():
            ms.append(jsFormat(m))
        resp.text = json.dumps(ms)

class UserResource:
    def on_get(self, req, resp):
        user = int(req.params["user"], 16)
        ms = store.messages.by_user(user)
        formatted = []
        for m in ms:
            if m["rq"]["sender"] == user:
                formatted.append(jsFormat(m))
        resp.text = json.dumps(formatted)

class MessageResource:
    def on_get(self, req, resp):
        hash = int(req.params["hash"], 16)
        m = store.messages.get_message(hash)
        resp.text = json.dumps(jsFormat(m))

    def on_post(self, req, resp):
        raw_data = json.load(req.bounded_stream)
        store.messages.append(raw_data)

# numbers in js are limited to ~53 bytes, so we have to send the numbers in our requests as hex strings
def jsFormat(m):
    message = []
    for part in m["rq"]["message"]:
        message.append(str(part))

    branches = []
    for branch in m["metadata"]["branches"]:
        branches.append({ "left": branch["left"], "value": str(branch["value"])})
    return {
        "rq": {
            "type": str(m["rq"]["type"]),
            "blocknumber": str(m["rq"]["blocknumber"]),
            "sender": str(m["rq"]["sender"]),
            "message": message,
            "signature": str(m["rq"]["signature"]),
        },
        "metadata": {
            "hash": str(m["metadata"]["hash"]),
            "root": str(m["metadata"]["root"]),
            "branches": branches,
        }
    }

api = falcon.App()
api.add_route('/api/messages', MessagesResource())
api.add_route('/api/message', MessageResource())
api.add_route('/api/user', UserResource())