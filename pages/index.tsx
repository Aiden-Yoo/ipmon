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
  updateAt: string;
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
  const [ipData, setIpData] = useState<GetPool[]>([]);
  const [summaryData, setSummaryData] = useState<GetSummary[]>([]);
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
  const onInvalid = (errors: FieldErrors) => {
    // console.log(errors);
  };
  const handleDelete = (row: any) => {
    enter({ id: row.row.original.id }, "DELETE");
  };

  useEffect(() => {
    if (mutateData) {
      mutate();
    }
  }, [mutateData]);

  useEffect(() => {
    if (data) {
      const getPool = data.ipPools.map((pool) => {
        return {
          id: pool.id,
          ip: pool.ip,
          group: pool.group,
          purpose: pool.purpose,
          use: pool.use,
          updateAt: moment(pool.updateAt).format("YY-MM-DD HH:mm"),
        };
      });
      setIpData(getPool);
      setSummaryData(data.summary);
    }
  }, [data]);

  const columns = useMemo(
    () => [
      {
        Header: "Category",
        accessor: "group",
        Filter: SelectColumnFilter,
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
        Header: "Last Updated",
        accessor: "updateAt",
        filter: "includes",
      },
      {
        Header: "Operation",
        Cell: (row: any) => (
          <div>
            <button
              className={cls(
                "font-medium text-sm border-b-2 border-transparent hover:text-gray-400 text-gray-500"
              )}
              onClick={() => handleDelete(row)}
            >
              Delete
            </button>
          </div>
        ),
      },
    ],
    []
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <h1 className="text-xl font-semibold">IPMON - CS</h1>
        <div className="flex justify-center">
          <div className="mt-6 mr-6">
            <Table columns={columns} data={ipData} />
          </div>
          <div className="mt-11 max-w-sm">
            <div>
              <h2 className="text-sm font-semibold">by Category</h2>
              <SummaryTable columns={summaryColumns} data={summaryData} />
            </div>
            <div className="mt-6">
              <h2 className="text-sm font-semibold">Add IP</h2>
              <div className="mt-4 py-6 align-middle inline-block min-w-full px-6 shadow overflow-hidden border-b rounded-lg bg-white">
                <form
                  onSubmit={handleSubmit(onValid, onInvalid)}
                  className="flex flex-col space-y-4"
                >
                  <Input
                    register={register("group", {
                      required: "Need to input Category",
                    })}
                    name="group"
                    label="Category"
                    type="text"
                    required
                  />
                  {errors.group?.message}
                  <Input
                    register={register("ip", {
                      required: "Need to input IP",
                      pattern: {
                        value:
                          /(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])/,
                        message: "ex) 1.1.1.1 or 2.2.2.2-5",
                      },
                    })}
                    name="ip"
                    label="IP"
                    type="text"
                    required
                  />
                  {errors.ip?.message}
                  <Input
                    register={register("purpose", {})}
                    name="purpose"
                    label="Purpose"
                    type="text"
                    required={false}
                  />
                  <button
                    className={cls(
                      "font-medium text-sm border-b-2 border-transparent hover:text-gray-400 text-gray-500"
                    )}
                  >
                    Submit
                  </button>
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
