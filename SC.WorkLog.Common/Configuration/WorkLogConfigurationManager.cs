using Microsoft.Extensions.Configuration;

namespace SC.WorkLog.Common.Configuration
{
    public static class WorkLogConfigurationManager
    {
        public static IConfiguration Configuration { get; private set; }
        public static string EnvironmentName { get; private set; }

        public static void SetConfiguration(IConfiguration configuration, string environmentName)
        {
            Configuration = configuration;
            EnvironmentName = environmentName;
        }
    }
}
