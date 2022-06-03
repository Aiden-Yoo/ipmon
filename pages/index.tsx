/* eslint-disable react-hooks/exhaustive-deps */
import type { NextPage } from "next";
import { useEffect, useMemo, useState } from "react";
import { FieldErrors, useForm } from "react-hook-form";
import moment from "moment";
import Table, {
  SelectColumnFilter,
  StatusPill,
  SummaryTable,
} from "@components/table";
import { cls } from "@libs/client/utils";
import Input from "@components/input";
import useMutation from "@libs/client/useMutation";
import useSWR, { SWRConfig } from "swr";
import { IpPool } from "@prisma/client";
import Select from "@components/select";

interface SubmitForm {
  ip: string;
  group: string;
  purpose: string;
}

interface MutationResult {
  ok: boolean;
}

interface IpPoolResponse {
  ok: boolean;
  ipPools: IpPool[];
  summary: { group: string[]; range: string[] }[];
}

interface GetPool {
  id: number;
  ip: string;
  group: string;
  purpose: string | null;
  use: boolean | null;
  checkAt: string;
  changeAt: string;
}

interface GetSummary {
  group: string[];
  range: string[];
}

const Home: NextPage = () => {
  const { data, error, mutate } = useSWR<IpPoolResponse>("/api/ips", {
    // refreshInterval: 500,
    // revalidateOnFocus: false,
    // revalidateOnReconnect: false,
  });
  const [enter, { data: mutateData, loading }] =
    useMutation<MutationResult>("/api/ips");
  const [isEdit, setIsEdit] = useState<boolean | undefined>(false);
  const [id, setId] = useState<number>();
  const [category, setCategory] = useState<string>();
  const [ip, setIp] = useState<string>();
  const [ipData, setIpData] = useState<GetPool[]>([]);
  const [summaryData, setSummaryData] = useState<GetSummary[]>([]);
  const [canDelete, setCanDelete] = useState<string>("");
  const [pageState, setPageState] = useState<number>(0);
  const [categoryState, setCategoryState] = useState<string>("");
  const [options, setOptions] = useState<string[]>([]);
  const [isSelect, setIsSelect] = useState<boolean>(true);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SubmitForm>({
    mode: "onChange",
  });
  const onValid = (validForm: SubmitForm) => {
    if (loading) return;
    enter(validForm, "POST");
    reset();
  };
  const onEditValid = (validForm: SubmitForm) => {
    if (loading) return;
    enter({ id, purpose: validForm.purpose }, "PUT");
    reset();
    setIsEdit(false);
  };
  const onInvalid = (errors: FieldErrors) => {
    // console.log(errors);
  };
  const handleDelete = (row: any) => {
    enter({ id: row.row.original.id }, "DELETE");
  };
  const handleEdit = (row: any) => {
    setIsEdit(true);
    setId(row.row.original.id);
    setCategory(row.row.original.group);
    setIp(row.row.original.ip);
  };
  const handleCancel = () => {
    setIsEdit(false);
  };
  const handleAddString = (e: any) => {
    e.preventDefault();
    setCanDelete(canDelete + e.target.innerText);
  };
  const handleClear = (e: any) => {
    e.preventDefault();
    if (e.target.innerText === "C") {
      setCanDelete("");
    }
  };

  useEffect(() => {
    if (mutateData) {
      mutate();
    }
  }, [mutateData]);

  useEffect(() => {
    if (data) {
      let makeOptions: string[] = [];
      const getPool = data.ipPools.map((pool) => {
        if (!makeOptions.includes(pool.group)) makeOptions.push(pool.group);
        return {
          id: pool.id,
          ip: pool.ip,
          group: pool.group,
          purpose: pool.purpose,
          use: pool.use,
          checkAt: moment(pool.checkAt).format("YY-MM-DD HH:mm"),
          changeAt: moment(pool.changeAt).format("YY-MM-DD HH:mm"),
        };
      });
      setIpData(getPool);
      setOptions(makeOptions);
      setSummaryData(data.summary);
    }
  }, [data]);

  const columns = useMemo(
    () => [
      {
        Header: "Category",
        accessor: "group",
        // Filter: SelectColumnFilter,
        Filter: (column: any) => SelectColumnFilter(column, setCategoryState),
      },
      {
        Header: "IP",
        accessor: "ip",
      },
      {
        Header: "Purpose",
        accessor: "purpose",
        filter: "includes",
      },
      {
        Header: "Status",
        accessor: "use",
        Cell: StatusPill,
      },
      {
        Header: "Last Checked",
        accessor: "checkAt",
        filter: "includes",
      },
      {
        Header: "Last Changed",
        accessor: "changeAt",
        filter: "includes",
      },
      {
        Header: "Operation",
        Cell: (row: any) => (
          <div>
            {canDelete === "MON" && (
              <button
                className={cls(
                  `font-medium text-sm border-b-2 mr-2 border-transparent   ${
                    isEdit
                      ? `text-gray-200`
                      : `hover:text-gray-400 text-gray-500`
                  }`
                )}
                onClick={() => handleDelete(row)}
                disabled={isEdit}
              >
                Delete
              </button>
            )}
            <button
              className={cls(
                `font-medium text-sm border-b-2 mr-2 border-transparent   ${
                  isEdit ? `text-gray-200` : `hover:text-gray-400 text-gray-500`
                }`
              )}
              onClick={() => handleEdit(row)}
              disabled={isEdit}
            >
              Edit
            </button>
          </div>
        ),
      },
    ],
    [isEdit, canDelete]
  );
  const summaryColumns = useMemo(
    () => [
      {
        Header: "Category",
        accessor: "group",
      },
      {
        Header: "IP Range",
        accessor: "range",
      },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <main className="min-w-fit mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <h1 className="text-xl font-semibold">
          IP
          <span
            className="cursor-default"
            onClick={(event) => handleAddString(event)}
          >
            M
          </span>
          <span
            className="cursor-default"
            onClick={(event) => handleAddString(event)}
          >
            O
          </span>
          <span
            className="cursor-default"
            onClick={(event) => handleAddString(event)}
          >
            N
          </span>
          {" - "}
          <span
            className="cursor-default"
            onClick={(event) => handleClear(event)}
          >
            C
          </span>
          S
        </h1>
        <div className="flex justify-center">
          <div className="mt-6 mr-6">
            <Table
              columns={columns}
              data={ipData}
              pageState={pageState}
              setPageState={setPageState}
              categoryState={categoryState}
            />
          </div>
          <div className="mt-11 min-w-fit">
            <div>
              <h2 className="text-sm font-semibold">by Category</h2>
              <SummaryTable columns={summaryColumns} data={summaryData} />
            </div>
            <div className="mt-6">
              <h2 className="text-sm font-semibold">Add IP</h2>
              <div className="mt-4 py-6 align-middle inline-block min-w-full px-6 shadow overflow-hidden border-b rounded-lg bg-white">
                <div className="text-xs text-right font-medium text-gray-700">
                  New{" "}
                  <input
                    type="checkbox"
                    className="appearance-none border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-gray-500 focus:border-gray-500 text-gray-500"
                    onChange={() => setIsSelect(!isSelect)}
                  />
                </div>
                <form
                  onSubmit={
                    !isEdit
                      ? handleSubmit(onValid, onInvalid)
                      : handleSubmit(onEditValid, onInvalid)
                  }
                  className="flex flex-col space-y-4"
                >
                  {isSelect ? (
                    <Select
                      register={
                        !isEdit
                          ? register("group", {
                              required: "Need to input Category",
                            })
                          : register("group", {
                              required: false,
                              value: category,
                            })
                      }
                      name="group"
                      label="Category"
                      required={!isEdit!}
                      disabled={isEdit}
                      value={isEdit ? category : undefined}
                      options={options}
                    />
                  ) : (
                    <Input
                      register={
                        !isEdit
                          ? register("group", {
                              required: "Need to input Category",
                            })
                          : register("group", {
                              required: false,
                              value: category,
                            })
                      }
                      name="group"
                      label="Category"
                      type="text"
                      required={!isEdit!}
                      disabled={isEdit}
                      value={isEdit ? category : undefined}
                    />
                  )}
                  {errors.group?.message}
                  <Input
                    register={
                      !isEdit
                        ? register("ip", {
                            required: "Need to input IP",
                            pattern: {
                              value:
                                /(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])/,
                              message: "ex) 1.1.1.1 or 2.2.2.2-5",
                            },
                          })
                        : register("ip", { required: false, value: ip })
                    }
                    name="ip"
                    label="IP"
                    type="text"
                    required={!isEdit!}
                    disabled={isEdit}
                    value={isEdit ? ip : undefined}
                  />
                  {errors.ip?.message}
                  <Input
                    register={register("purpose", {})}
                    name="purpose"
                    label="Purpose"
                    type="text"
                    required={false}
                  />
                  <div className={cls("flex justify-center")}>
                    <button
                      className={cls(
                        "font-medium text-sm border-b-2 border-transparent hover:text-gray-400 text-gray-500"
                      )}
                    >
                      Submit
                    </button>
                    {isEdit ? (
                      <button
                        className={cls(
                          "font-medium text-sm border-b-2 ml-3 border-transparent hover:text-gray-400 text-gray-500"
                        )}
                        onClick={() => handleCancel()}
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
