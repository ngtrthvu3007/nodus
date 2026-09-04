export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const id = getRouterParam(event, "id");

  return $fetch(`/notes/${id}`, {
    baseURL: config.nodusApiBase,
  });
});
