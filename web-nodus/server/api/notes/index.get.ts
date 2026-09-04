export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const query = getQuery(event);

  return $fetch("/notes", {
    baseURL: config.nodusApiBase,
    query: {
      q: query.q,
    },
  });
});
