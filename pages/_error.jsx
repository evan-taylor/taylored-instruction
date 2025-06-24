import * as Sentry from "@sentry/nextjs";
import Error from "next/error";
import Head from "next/head";

const CustomErrorComponent = (props) => {
  return (
    <>
      <Head>
        <title>Error | Taylored Instruction</title>
        <meta
          name="description"
          content="An error occurred. Please try again."
        />
      </Head>
      <Error statusCode={props.statusCode} />
    </>
  );
};

CustomErrorComponent.getInitialProps = async (contextData) => {
  // In case this is running in a serverless function, await this in order to give Sentry
  // time to send the error before the lambda exits
  await Sentry.captureUnderscoreErrorException(contextData);

  // This will contain the status code of the response
  return Error.getInitialProps(contextData);
};

export default CustomErrorComponent;
