import * as http from "http";
import { handleRequest } from "./signer";

http.createServer(function(request, response) {
    const chunks = [];
    request.on('data', chunk => chunks.push(chunk));
    request.on('end', () => {
        try {
            const siloRequest = JSON.parse(Buffer.concat(chunks).toString());
            handleRequest(siloRequest);
            response.end('Ended\n');
        } catch (e) {
            console.error(e);
            response.writeHead(500);
            response.end(e.message);
        }
    })
}).listen(8888);

console.log("Server running at\n  => http://localhost: 8888/\nCTRL + C to shutdown");