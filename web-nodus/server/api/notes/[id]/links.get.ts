export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const id = getRouterParam(event, "id");

  return $fetch(`/notes/${id}/links`, {
    method: "GET",
    baseURL: config.nodusApiBase,
  });
});
