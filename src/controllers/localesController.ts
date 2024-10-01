import showLocalesService from "@/services/localesServices/showLocalesService";
import type {
  Data,
  LocaleError,
} from "@services/localesServices/showLocalesService";
import listSectionService from "@services/localesServices/listSectionService";
import type {
  FastifyReply,
  FastifyRequest,
  RouteShorthandOptions,
} from "fastify";
import decodeToken from "@/helpers/decodeToken";

export type ListLocalesRequest = {
  Params: { categoryList: string };
  Querystring: { pageNumber: string; limit: string };
};

export type SectionRequest = {
  Params: { localeId: string };
  Querystring: { sectionId: string };
};

export const listOpts: RouteShorthandOptions = {
  schema: {
    headers: {
      type: "object",
      properties: {
        authorization: { type: "string" },
      },
    },
    params: {
      type: "object",
      required: ["categoryList"],
      properties: {
        category: { type: "string" },
      },
    },
    querystring: {
      type: "object",
      required: ["pageNumber", "limit"],
      properties: {
        pageNumber: { type: "string" },
        limit: { type: "string" },
      },
    },
  },
};

export const listSectionOpts: RouteShorthandOptions = {
  schema: {
    headers: {
      type: "object",
      properties: {
        authorization: { type: "string" },
      },
    },
    params: {
      type: "object",
      required: ["localeId"],
      properties: {
        localeId: { type: "string" },
      },
    },
    querystring: {
      type: "object",
      required: ["sectionId"],
      properties: {
        sectionId: { type: "string" },
      },
    },
  },
};

// continuar a função, finalizando
const list = async (
  request: FastifyRequest<ListLocalesRequest>,
  reply: FastifyReply,
) => {
  const { categoryList } = request.params;
  const { pageNumber, limit } = request.query;
  let userId = 0;

  if ("authorization" in request.headers && request.headers.authorization) {
    const { authorization } = request.headers;
    userId = decodeToken(authorization);
  }

  if (pageNumber && limit) {
    const parsedCategoryList: Array<string> =
      categoryList !== "" && categoryList.includes(",")
        ? categoryList.split(",")
        : categoryList === ""
          ? []
          : [categoryList];

    const data: Data | LocaleError = await showLocalesService(
      Number.parseInt(pageNumber),
      Number.parseInt(limit),
      userId,
      parsedCategoryList,
    );
    if ("error" in data) {
      return reply.status(400).send({ error: { message: data.error } });
    }
    return reply.status(200).send({ data });
  }
  const message: string = `Check parameter(s): ${pageNumber ? "" : "pageNumber,"} 
                            ${limit ? "" : "limit"}`;
  return reply.status(400).send({ error: { message } });
};

const listSection = async (
  request: FastifyRequest<SectionRequest>,
  reply: FastifyReply,
) => {
  const { localeId } = request.params;
  const { sectionId } = request.query;
  let userId = 0;

  if ("authorization" in request.headers && request.headers.authorization) {
    const { authorization } = request.headers;
    userId = decodeToken(authorization);
  }

  const sectionInfo = await listSectionService(
    Number.parseInt(localeId),
    userId,
    sectionId,
  );

  if (sectionInfo) {
    if ("error" in sectionInfo) {
      return reply
        .status(sectionInfo.status)
        .send({ error: sectionInfo.error });
    }
    return reply.status(sectionInfo.status).send({ data: sectionInfo.result });
  }
  return reply
    .status(500)
    .send({ error: "Inernal Server Error, please try again" });
};

export default { list, listSection };
