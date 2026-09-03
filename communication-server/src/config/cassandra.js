import cassandra from "cassandra-driver";

const {
    CASSANDRA_HOST,
    CASSANDRA_DATACENTER,
    CASSANDRA_KEYSPACE,
} = process.env;

if (!CASSANDRA_HOST || !CASSANDRA_DATACENTER || !CASSANDRA_KEYSPACE) {
    throw new Error(
        "Missing required Cassandra environment variables"
    );
}

const client = new cassandra.Client({
    contactPoints: [CASSANDRA_HOST],
    localDataCenter: CASSANDRA_DATACENTER,
    keyspace: CASSANDRA_KEYSPACE,
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