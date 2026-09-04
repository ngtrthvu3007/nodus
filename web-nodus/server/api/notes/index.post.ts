export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const body = await readBody(event);

  return $fetch("/notes", {
    method: "POST",
    baseURL: config.nodusApiBase,
    body,
  });
});
