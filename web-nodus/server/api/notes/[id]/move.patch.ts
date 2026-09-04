export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const id = getRouterParam(event, "id");
  const body = await readBody(event);

  return $fetch(`/notes/${id}/move`, {
    method: "PATCH",
    baseURL: config.nodusApiBase,
    body,
  });
});
