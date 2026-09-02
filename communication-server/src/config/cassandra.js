import cassandra from "cassandra-driver";

const client = new cassandra.Client({
    contactPoints: [process.env.CASSANDRA_HOST || "127.0.0.1"],
    localDataCenter: process.env.CASSANDRA_DATACENTER || "datacenter1",
    keyspace: process.env.CASSANDRA_KEYSPACE || "navriti",
});

export const connectCassandra = async () => {
    try {
        await client.connect();
        console.log("Cassandra connected");
    } catch (error) {
        console.error("Cassandra connection failed:");
        console.error(error.message);
        process.exit(1);
    }
};

export default client;