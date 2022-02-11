import falcon
import json
import store

class MessagesResource:
    def on_get(self, req, resp):
        ms = []
        for m in store.messages:
            ms.append({"rq": jsFormat(m["rq"]), "metadata": m["metadata"]})
        resp.text = json.dumps(ms)

class UserResource:
    def on_get(self, req, resp):
        user = int(req.params["user"], 16)
        usersMessages = []
        for m in store.messages:
            if m["rq"]["sender"] == user:
                usersMessages.append({"rq": jsFormat(m["rq"]), "metadata": m["metadata"]})
        resp.text = json.dumps(usersMessages)

class MessageResource:
    def on_get(self, req, resp):
        hash = req.params["hash"]
        for m in store.messages:
            if m["metadata"]["hash"] == hash:
                resp.text = json.dumps({"rq": jsFormat(m["rq"]), "metadata": m["metadata"]})

    def on_post(self, req, resp):
        raw_data = json.load(req.bounded_stream)
        store.messages.append(raw_data)

# numbers in js are limited to ~53 bytes, so we have to send the numbers in our requests as hex strings
def jsFormat(rq):
    message = []
    for part in rq["message"]:
        message.append(str(part))
    return {
        "type": str(rq["type"]),
        "blocknumber": str(rq["blocknumber"]),
        "sender": str(rq["sender"]),
        "message": message,
        "signature": str(rq["signature"]),
    }

api = falcon.App()
api.add_route('/api/messages', MessagesResource())
api.add_route('/api/message', MessageResource())
api.add_route('/api/user', UserResource())